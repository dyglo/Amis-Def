
import { GoogleGenAI, Type } from "@google/genai";
import { IntelligenceAnalysis, Sitrep, ThreatLevel } from "../types";

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
    const prompt = `Act as an OSINT Intelligence Agent. 
    Search for recent or historical conflict events, military maneuvers, or security incidents in the region: "${query}".
    Return a JSON object with:
    1. 'sitreps': an array of 3-5 event objects matching the Sitrep interface. 
       Ensure id format is 'SR-EXT-XXX'. 
       ThreatLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL.
       Category must be one of: CONFLICT, MARITIME, CYBER, POLITICAL.
       Coordinates must be [latitude, longitude].
    2. 'center': [latitude, longitude] representing the focal point of the region.
    3. 'zoom': an integer (usually 4-8) for optimal visualization.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

      const text = response.text || "{}";
      return JSON.parse(text);
    } catch (error) {
      console.error("Search intelligence failed:", error);
      return { sitreps: [], center: [0, 0], zoom: 2 };
    }
  }

  async getMapContext(location: string): Promise<string> {
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
