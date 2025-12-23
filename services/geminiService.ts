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

export const analyzeDeviceReviews = async (query: string): Promise<ReviewData> => {
  // Use gemini-1.5-flash which is fast and supports JSON schema
  const modelId = "gemini-1.5-flash";
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

  try {
    const genAI = getAIClient();

    // Configure model with tools
    // Note: googleSearch tool requires specific setup. For 1.5-flash via AI Studio key, 
    // it usually works simply by enablement. 
    // If this fails, we will fallback to basic model without tools.
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: reviewSchema,
      },
      // Note: 'tools' with googleSearch is not always available on free tier standard keys in all regions.
      // We will try WITHOUT explicit tools first, relying on the model's internal knowledge 
      // OR add tools if strictly needed. 
      // For this step, I will ENABLE it because the user wants "Search".
      tools: [{ googleSearch: {} }],
    });

    console.log(`Starting analysis for: ${query} using ${modelId}`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    const data: ReviewData = JSON.parse(jsonText);

    // Extract grounding metadata if available (different structure in this SDK)
    // The stable SDK puts it in result.response.candidates[0].groundingMetadata
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
    console.error("Detailed Error in analyzeDeviceReviews:", error);

    // Friendly Error Logic
    let friendlyError = "Failed to analyze reviews. ";

    if (error.message?.includes("API Key") || error.message?.includes("403")) {
      friendlyError += "API Key configuration issue. (403/Forbidden). ";
    } else if (error.message?.includes("404")) {
      friendlyError += "Model not found (404). Ensure you have access to gemini-1.5-flash. ";
    } else if (error.message?.includes("429")) {
      friendlyError += "Quota exceeded (429). ";
    }

    // Try fallback (NO TOOLS)
    if (!friendlyError.includes("API Key")) { // Don't retry if key is definitely bad
      try {
        console.log("Attempting fallback (no tools)...");
        const genAI = getAIClient();
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // No tools
        await fallbackModel.generateContent("Test");
        console.log("Fallback PASSED.");
        friendlyError += "Basic connectivity works, but Search Tool failed. (Maybe your key doesn't support Search?)";
      } catch (fbError: any) {
        console.error("Fallback FAILED:", fbError);
        friendlyError += `API Key or Model completely invalid. Raw: ${fbError.message}`;
      }
    } else {
      friendlyError += `Raw Error: ${error.message}`;
    }

    throw new Error(friendlyError);
  }
};