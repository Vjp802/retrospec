import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ReviewData } from "../types";

// The API key must be obtained from VITE_API_KEY
const getAIClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("VITE_API_KEY is missing!");
    throw new Error("API Key is missing. Please set VITE_API_KEY in your environment.");
  }
  return new GoogleGenAI({ apiKey });
};

const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    deviceName: { type: Type.STRING, description: "Correct official name of the device" },
    launchDate: { type: Type.STRING, description: "Launch date in YYYY-MM-DD format" },
    currentVerdict: { type: Type.STRING, description: "A short verdict: 'Buy', 'Wait', or 'Skip' based on current value" },
    aggregateScore: { type: Type.NUMBER, description: "Current overall score out of 100" },
    reviewCount: { type: Type.INTEGER, description: "The total volume of user and expert reviews considered. Prefer aggregate counts (e.g., 'based on 2,500 reviews')." },
    confidenceScore: { type: Type.NUMBER, description: "Confidence score (0-100) based on data volume and recency. >1000 reviews + recent threads = 90+. Sparse/Old data = <50." },
    dataSourcesFound: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of primary domains where data was found (e.g., 'reddit.com', 'youtube.com', 'theverge.com')"
    },
    timePoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Time period label (e.g., 'Launch Day', '3 Months Later', 'Long Term')" },
          date: { type: Type.STRING, description: "Approximate date for this period YYYY-MM-DD" },
          score: { type: Type.NUMBER, description: "Sentiment score out of 100 for this specific period" },
          summary: { type: Type.STRING, description: "Brief summary of sentiment during this period" }
        },
        required: ["label", "date", "score", "summary"]
      }
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of consistent pros mentioned in reviews"
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of consistent cons or issues that appeared over time"
    }
  },
  required: ["deviceName", "launchDate", "currentVerdict", "aggregateScore", "reviewCount", "confidenceScore", "dataSourcesFound", "timePoints", "pros", "cons"]
};

export const analyzeDeviceReviews = async (query: string): Promise<ReviewData> => {
  try {
    const model = "gemini-3-flash-preview";
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
      Context: Today's date is ${today}.
      Analyze reviews for the device: "${query}".
      
      1. Identify the official launch date.
      2. Perform a deep and broad search for reviews.
         - Search for "Launch day reviews" from major outlets (Verge, CNET, Engadget).
         - Search for "Long term reviews" from YouTube creators (MKBHD, MrWhoseTheBoss).
         - CRITICAL: Search for "User ratings" and "Aggregate reviews" on sites like Amazon, Best Buy, GSMArena, or Metacritic to get a large sample size of opinions.
      3. Compare the sentiment over time (Launch vs Now).
         - Did updates fix bugs? 
         - Did the battery degrade? 
         - Is the price-to-performance ratio better now?
      4. Generate a sentiment score (0-100) for each time point.
      5. Provide a final "Buy/Wait/Skip" verdict based on its CURRENT status relative to today's market.
      6. For 'reviewCount': We want the Total Market Sentiment Volume.
         - Look for aggregate review counts on major retail or aggregator sites (e.g., "4.6/5 stars from 2,500 ratings").
         - If you find such data, use that number (e.g., 2500).
         - If not, sum up the individual comments/reviews you found in Reddit threads and articles.
      7. Calculate 'confidenceScore' (0-100):
         - Score > 90 if: You found >1,000 aggregated reviews AND recent user threads (last 30 days) confirming current status.
         - Score 70-89 if: Good amount of reviews but slightly older data (3-6 months).
         - Score < 50 if: Data is sparse, conflicting, or >2 years old with no recent updates.
      8. Populate 'dataSourcesFound': List the top 3-5 domains where you found the most valuable data (e.g., 'reddit.com', 'gsmarena.com').
      
      Ensure the analysis captures the arc of the device's lifespan.
    `;

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: reviewSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data received from Gemini");
    }

    const data: ReviewData = JSON.parse(jsonText);

    // Extract sources from grounding metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => {
      if (chunk.web) {
        return { title: chunk.web.title, uri: chunk.web.uri };
      }
      return null;
    }).filter((s: any) => s !== null) || [];

    // Filter duplicate sources based on URI
    const uniqueSources = sources.filter((source: any, index: any, self: any) =>
      index === self.findIndex((t: any) => (
        t.uri === source.uri
      ))
    );

    return { ...data, sources: uniqueSources };

  } catch (error) {
    console.error("Error fetching review analysis:", error);
    throw error;
  }
};