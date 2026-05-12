import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

import type { UserListTagType } from "../types";
import { AiSuggestionSchema } from "./ai-schema";

export interface AiSuggestionItem {
  title: string;
  year?: number;
  media_type: "movie" | "tv";
}

export interface AiSuggestionResult {
  items: AiSuggestionItem[];
  suggested_tags: UserListTagType[];
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts: number; delay: number },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < options.attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < options.attempts - 1) {
        logger.warn(`Retrying after attempt ${i + 1}:`, error);
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }
    }
  }
  throw lastError;
}

export const ai = {
  getSuggestions: async (prompt: string): Promise<AiSuggestionResult> => {
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke(
          "ai-suggestions",
          { body: { prompt } },
        );

        if (error) {
          throw new Error(error.message || "Edge Function request failed");
        }

        return data;
      },
      { attempts: 2, delay: 1000 },
    );

    return AiSuggestionSchema.parse(result) as AiSuggestionResult;
  },
};
