import { geminiProvider } from "./gemini";
import type { AiProvider } from "./types";

const providerName = import.meta.env.VITE_AI_PROVIDER ?? "gemini";

function createProvider(): AiProvider {
  switch (providerName) {
    default:
      return geminiProvider;
  }
}

export const aiProvider: AiProvider = createProvider();
