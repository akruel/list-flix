import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import type { AiProvider } from "./types";

const providerName = import.meta.env.VITE_AI_PROVIDER ?? "gemini";

function createProvider(): AiProvider {
  switch (providerName) {
    case "groq":
      return groqProvider;
    default:
      return geminiProvider;
  }
}

export const aiProvider: AiProvider = createProvider();
