
import { GoogleGenAI, Type } from "@google/genai";
import { IntelligenceAnalysis, Sitrep, ThreatLevel } from "../types";

export class IntelligenceService {
  // Fix: Removed constructor-based initialization to allow creating a fresh instance per request, 
  // ensuring it always uses the most up-to-date configuration as per guidelines.

  async analyzeSitrep(sitrep: Sitrep): Promise<IntelligenceAnalysis> {
    // Fix: Initialize GoogleGenAI with the required object format and process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Perform a Strategic Deep Analysis of the following SITREP for a Defense Intelligence Agency. 
      CONTEXT: The current date is February 2026. Use the latest situational data available via Google Search grounding.
      
      Title: ${sitrep.title}
      Location: ${sitrep.coordinates.join(', ')}
      Category: ${sitrep.category}
      Threat Level: ${sitrep.threatLevel}
      Description: ${sitrep.description}
      Entities Identified: ${[...sitrep.entities.people, ...sitrep.entities.places, ...sitrep.entities.orgs].join(', ')}

      Analyze geopolitical implications, strategic risks (considering early 2026 trends), and provide recommended response protocols.
      IMPORTANT: Return the response in JSON format.
    `;

    try {
      // Fix: Use gemini-3-pro-preview for complex reasoning tasks as per task requirements.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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

      // Fix: Access the text property directly (it's a getter, not a method).
      const text = response.text || "{}";
      const analysis = JSON.parse(text);
      
      // Fix: Extract grounding chunks as required when using googleSearch to display reference URLs.
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

  async searchNewIntelligence(query: string): Promise<{ sitreps: Sitrep[], center: [number, number], zoom: number }> {
    // Fix: Initialize GoogleGenAI with the required object format.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Act as an OSINT Intelligence Agent. 
    Search for the MOST RECENT conflict events, military maneuvers, or security incidents in February 2026 for the region: "${query}".
    Pay special attention to areas like Jonglei state (South Sudan), Eastern DRC (Goma/Sake), and Middle Eastern conflict zones if relevant.
    Return a JSON object with:
    1. 'sitreps': an array of 3-5 event objects matching the Sitrep interface. 
       Ensure id format is 'SR-EXT-XXX'. 
       ThreatLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL.
       Category must be one of: CONFLICT, MARITIME, CYBER, POLITICAL.
       Coordinates must be [latitude, longitude].
       Timestamp must be in February 2026.
    2. 'center': [latitude, longitude] representing the focal point of the region.
    3. 'zoom': an integer (usually 4-8) for optimal visualization.`;

    try {
      // Fix: Use gemini-3-pro-preview for complex text tasks like data gathering and parsing.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sitreps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    timestamp: { type: Type.STRING },
                    threatLevel: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    entities: {
                      type: Type.OBJECT,
                      properties: {
                        people: { type: Type.ARRAY, items: { type: Type.STRING } },
                        places: { type: Type.ARRAY, items: { type: Type.STRING } },
                        orgs: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  }
                }
              },
              center: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              zoom: { type: Type.NUMBER }
            }
          }
        },
      });

      // Fix: Access the text property directly.
      const text = response.text || "{}";
      return JSON.parse(text);
    } catch (error) {
      console.error("Search intelligence failed:", error);
      return { sitreps: [], center: [0, 0], zoom: 2 };
    }
  }

  async getMapContext(location: string): Promise<string> {
    // Fix: Initialize GoogleGenAI with the required object format.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      // Fix: Maps grounding is only supported in Gemini 2.5 series models.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide a detailed geographical and infrastructure summary for ${location}. Focus on military significance in 2026.`,
        config: {
          tools: [{ googleMaps: {} }]
        }
      });
      // Fix: Access the text property directly.
      return response.text || "No mapping intelligence available.";
    } catch (error) {
      return "Contextual mapping intelligence currently offline.";
    }
  }
}

export const intelligenceService = new IntelligenceService();
