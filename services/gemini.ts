
import { GoogleGenAI, Type } from "@google/genai";
import { IntelligenceAnalysis, Sitrep } from "../types";

export class IntelligenceService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeSitrep(sitrep: Sitrep): Promise<IntelligenceAnalysis> {
    const prompt = `
      Perform a Strategic Deep Analysis of the following SITREP for a Defense Intelligence Agency:
      
      Title: ${sitrep.title}
      Location: ${sitrep.coordinates.join(', ')}
      Category: ${sitrep.category}
      Threat Level: ${sitrep.threatLevel}
      Description: ${sitrep.description}
      Entities Identified: ${[...sitrep.entities.people, ...sitrep.entities.places, ...sitrep.entities.orgs].join(', ')}

      Analyze geopolitical implications, strategic risks, and provide recommended response protocols.
    `;

    try {
      // Using gemini-3-flash-preview with googleSearch tool for real-time grounding
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategicOverview: { type: Type.STRING },
              geopoliticalImplications: { type: Type.STRING },
              recommendedResponse: { type: Type.STRING }
            },
            required: ["strategicOverview", "geopoliticalImplications", "recommendedResponse"]
          }
        },
      });

      const text = response.text || "{}";
      const analysis = JSON.parse(text);
      
      // Extract grounding links
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || "Reference",
          uri: chunk.web?.uri || ""
        })) || [];

      return {
        ...analysis,
        links
      };
    } catch (error) {
      console.error("AI Analysis failed:", error);
      return {
        strategicOverview: "Analysis system unavailable. Local protocols engaged.",
        geopoliticalImplications: "Unable to calculate risk vectors.",
        recommendedResponse: "Standard escalation procedures suggested.",
        links: []
      };
    }
  }

  async getMapContext(location: string): Promise<string> {
    // Using gemini-2.5-flash for map-specific grounding
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide a detailed geographical and infrastructure summary for ${location}. Focus on military significance.`,
        config: {
          tools: [{ googleMaps: {} }]
        }
      });
      return response.text || "No mapping intelligence available.";
    } catch (error) {
      return "Contextual mapping intelligence currently offline.";
    }
  }
}

export const intelligenceService = new IntelligenceService();
