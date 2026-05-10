import { aiProvider } from "./ai/providers";

export const ai = {
  getSuggestions: aiProvider.getSuggestions.bind(aiProvider),
};
