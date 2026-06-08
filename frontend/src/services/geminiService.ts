
import { GoogleGenAI, Type } from "@google/genai";

export const getMatchScore = async (seekerProfile: string, jobDescription: string): Promise<{ score: number; reasoning: string }> => {
  /** Create a new GoogleGenAI instance right before the call as recommended */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the match between this candidate profile and job description. 
      Profile: ${seekerProfile}
      Job: ${jobDescription}`,
      config: {
        responseMimeType: "application/json",
        /** Use responseSchema for structured JSON output */
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: "Match score from 0 to 100",
            },
            reasoning: {
              type: Type.STRING,
              description: "Short one-sentence explanation for the score",
            }
          },
          required: ["score", "reasoning"]
        }
      }
    });
    
    /** Access text property directly (not a method) */
    const text = response.text || "{}";
    const result = JSON.parse(text);
    
    return {
      score: result.score || 0,
      reasoning: result.reasoning || "Could not calculate match."
    };
  } catch (error) {
    console.error('AI Matching Error:', error);
    return { score: 0, reasoning: "AI matching unavailable." };
  }
};
