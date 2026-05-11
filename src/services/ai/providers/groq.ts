import Groq from "groq-sdk";

import { logger } from "@/lib/logger";

import { AiSuggestionSchema } from "../../ai-schema";
import { buildPrompt, SYSTEM_INSTRUCTION } from "./prompt";
import { withRetry } from "./retry";
import type { AiProvider, AiSuggestionResult } from "./types";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = import.meta.env.VITE_GROQ_MODEL ?? "llama-3.3-70b-versatile";

if (!API_KEY) {
  logger.error("VITE_GROQ_API_KEY is missing");
}

const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

export const groqProvider: AiProvider = {
  getSuggestions: async (prompt: string): Promise<AiSuggestionResult> => {
    const fullPrompt = buildPrompt(prompt);

    const result = await withRetry(
      () =>
        groq.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: SYSTEM_INSTRUCTION,
            },
            { role: "user", content: fullPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      { attempts: 2, delay: 1000 },
    );

    const text = result.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(text);

    return AiSuggestionSchema.parse(raw) as AiSuggestionResult;
  },
};
