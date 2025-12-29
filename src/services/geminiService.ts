import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LoopCategory } from "../types";
import { GEMINI_MODEL, LOOP_ANALYSIS_PROMPT } from "../constants";

export const analyzeAudio = async (base64Audio: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We strictly define the schema to ensure we get usable data back.
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: LOOP_ANALYSIS_PROMPT
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            loops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: Object.values(LoopCategory) },
                  start: { type: Type.NUMBER, description: "Start time in seconds" },
                  end: { type: Type.NUMBER, description: "End time in seconds" },
                  description: { type: Type.STRING, description: "Brief description of the loop" }
                },
                required: ["category", "start", "end", "description"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as AnalysisResult;
    
    // Add unique IDs to loops for React keys
    result.loops = result.loops.map((loop, idx) => ({
      ...loop,
      id: `loop-${idx}-${Date.now()}`
    }));

    return result;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};