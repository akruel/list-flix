import { GoogleGenerativeAI } from "@google/generative-ai";

import { logger } from "@/lib/logger";

import { AiSuggestionSchema } from "../../ai-schema";
import { buildPrompt } from "./prompt";
import { withRetry } from "./retry";
import type { AiProvider, AiSuggestionResult } from "./types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.0-flash";

if (!API_KEY) {
  logger.error("VITE_GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiProvider: AiProvider = {
  getSuggestions: async (prompt: string): Promise<AiSuggestionResult> => {
    const fullPrompt = buildPrompt(prompt);

    const model = genAI.getGenerativeModel({ model: MODEL });

    const result = await withRetry(
      () =>
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      { attempts: 2, delay: 1000 },
    );

    const response = result.response;
    const text = response.text();

    const raw = JSON.parse(text);

    return AiSuggestionSchema.parse(raw) as AiSuggestionResult;
  },
};
