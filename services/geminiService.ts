import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ReviewData } from "../types";

// The API key must be obtained from VITE_API_KEY
const getAIClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: VITE_API_KEY is missing! Please check .env.local file.");
    throw new Error("API Key is missing. Please set VITE_API_KEY in your environment.");
  }
  // Diagnostic: Check if key looks roughly correct without exposing it
  if (!apiKey.startsWith("AIza")) {
    console.warn("WARNING: VITE_API_KEY does not start with 'AIza'. It might be invalid.");
  }
  return new GoogleGenerativeAI(apiKey);
};

const reviewSchema = {
  type: SchemaType.OBJECT,
  properties: {
    deviceName: { type: SchemaType.STRING, description: "Correct official name of the device" },
    launchDate: { type: SchemaType.STRING, description: "Launch date in YYYY-MM-DD format" },
    currentVerdict: { type: SchemaType.STRING, description: "A short verdict: 'Buy', 'Wait', or 'Skip' based on current value" },
    aggregateScore: { type: SchemaType.NUMBER, description: "Current overall score out of 100" },
    reviewCount: { type: SchemaType.INTEGER, description: "The total volume of user and expert reviews considered." },
    confidenceScore: { type: SchemaType.NUMBER, description: "Confidence score (0-100) based on data volume and recency." },
    dataSourcesFound: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of primary domains where data was found"
    },
    timePoints: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING, description: "Time period label" },
          date: { type: SchemaType.STRING, description: "Approximate date YYYY-MM-DD" },
          score: { type: SchemaType.NUMBER, description: "Sentiment score out of 100" },
          summary: { type: SchemaType.STRING, description: "Brief summary" }
        },
        required: ["label", "date", "score", "summary"]
      }
    },
    pros: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of consistent pros"
    },
    cons: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of consistent cons"
    }
  },
  required: ["deviceName", "launchDate", "currentVerdict", "aggregateScore", "reviewCount", "confidenceScore", "dataSourcesFound", "timePoints", "pros", "cons"]
};

const KNOWN_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

export const analyzeDeviceReviews = async (query: string): Promise<ReviewData> => {
  const genAI = getAIClient();
  const today = new Date().toISOString().split('T')[0];

  const prompt = `
    Context: Today's date is ${today}.
    Analyze reviews for the device: "${query}".
    
    1. Identify the official launch date.
    2. Perform a deep and broad search for reviews.
       - Search for "Launch day reviews" from major outlets.
       - Search for "Long term reviews" from YouTube creators.
       - CRITICAL: Search for "User ratings" and "Aggregate reviews".
    3. Compare the sentiment over time (Launch vs Now).
    4. Generate a sentiment score (0-100) for each time point.
    5. Provide a final "Buy/Wait/Skip" verdict.
    6. For 'reviewCount': Estimate the Total Market Sentiment Volume.
    7. Calculate 'confidenceScore' (0-100).
    8. Populate 'dataSourcesFound'.
    
    Ensure the analysis captures the arc of the device's lifespan.
  `;

  let lastError: any = null;

  // Try models in sequence until one works
  for (const modelId of KNOWN_MODELS) {
    try {
      console.log(`Attempting analysis with model: ${modelId}`);

      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: reviewSchema,
        },
        // Try with tools enabled
        tools: [{ googleSearch: {} } as any],
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();

      if (!jsonText) throw new Error("Empty response");

      console.log(`Success with model: ${modelId}`);
      const data: ReviewData = JSON.parse(jsonText);

      // Extract sources
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => {
        if (chunk.web?.uri) {
          return { title: chunk.web.title || "Source", uri: chunk.web.uri };
        }
        return null;
      }).filter((s: any) => s !== null) || [];

      // Filter duplicates
      const uniqueSources = sources.filter((source: any, index: any, self: any) =>
        index === self.findIndex((t: any) => (
          t.uri === source.uri
        ))
      );

      return { ...data, sources: uniqueSources };

    } catch (error: any) {
      console.warn(`Failed with model ${modelId}:`, error.message);
      lastError = error;

      // If it's an API Key error (403), stop trying other models, it won't help.
      if (error.message?.includes("API Key") || error.message?.includes("403")) {
        break;
      }
      // Continue to next model if it was a 404 or other potentially model-specific error
    }
  }

  // If we get here, all models failed
  console.error("All models failed. Last error:", lastError);

  let friendlyError = "Failed to analyze reviews. ";
  if (lastError?.message?.includes("API Key")) {
    friendlyError += `API Key configuration issue. (403). Raw: ${lastError.message}`;
  } else {
    friendlyError += `All available models failed. Last error: ${lastError?.message || lastError}`;
  }

  throw new Error(friendlyError);
};