import type { AiProvider } from "./types";

const providerName = import.meta.env.VITE_AI_PROVIDER ?? "gemini";

async function createProvider(): Promise<AiProvider> {
  switch (providerName) {
    case "groq": {
      const { groqProvider } = await import("./groq");
      return groqProvider;
    }
    default: {
      const { geminiProvider } = await import("./gemini");
      return geminiProvider;
    }
  }
}

let _provider: AiProvider | null = null;

async function getProvider(): Promise<AiProvider> {
  if (!_provider) {
    _provider = await createProvider();
  }
  return _provider;
}

export const aiProvider: AiProvider = {
  getSuggestions: async (prompt: string) => {
    const provider = await getProvider();
    return provider.getSuggestions(prompt);
  },
};
