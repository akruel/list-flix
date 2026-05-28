import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ContentItem } from "../types";
import { NEW_KEYS } from "./migrate";

interface TasteStore {
  tasteSuggestions: ContentItem[] | null;
  tasteSuggestionsTimestamp: number | null;
  tasteSuggestionsScope: string | null;
  setTasteSuggestions: (suggestions: ContentItem[], scope?: string) => void;
  clearTasteSuggestions: () => void;
}

export const useTasteStore = create<TasteStore>()(
  persist(
    (set) => ({
      tasteSuggestions: null,
      tasteSuggestionsTimestamp: null,
      tasteSuggestionsScope: null,

      setTasteSuggestions: (suggestions, scope) => {
        set({
          tasteSuggestions: suggestions,
          tasteSuggestionsTimestamp: Date.now(),
          tasteSuggestionsScope: scope ?? null,
        });
      },

      clearTasteSuggestions: () => {
        set({
          tasteSuggestions: null,
          tasteSuggestionsTimestamp: null,
          tasteSuggestionsScope: null,
        });
      },
    }),
    {
      name: NEW_KEYS.taste,
    },
  ),
);
