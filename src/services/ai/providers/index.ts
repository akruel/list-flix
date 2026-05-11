import { groqProvider } from "./groq";
import type { AiProvider } from "./types";

export const aiProvider: AiProvider = {
  getSuggestions: async (prompt: string) => {
    return groqProvider.getSuggestions(prompt);
  },
};
