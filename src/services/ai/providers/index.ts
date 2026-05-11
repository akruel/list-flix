import { groqProvider } from "./groq";
import type { AiProvider } from "./types";

const provider = (import.meta.env.VITE_AI_PROVIDER ?? "groq") as string;

const providers: Record<string, AiProvider> = {
  groq: groqProvider,
};

const selected = providers[provider];
if (!selected) {
  throw new Error(
    `Unknown AI provider: "${provider}". Available: ${Object.keys(providers).join(", ")}`,
  );
}

export const aiProvider: AiProvider = selected;
