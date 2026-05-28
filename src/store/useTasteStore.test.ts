// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { ContentItem } from "../types";
import { useTasteStore } from "./useTasteStore";

describe("useTasteStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useTasteStore.setState({
      tasteSuggestions: null,
      tasteSuggestionsTimestamp: null,
      tasteSuggestionsScope: null,
    });
  });

  it("setTasteSuggestions updates state with suggestions and timestamp", () => {
    const suggestions = [
      { id: 1, title: "A", media_type: "movie" } as ContentItem,
    ];

    useTasteStore.getState().setTasteSuggestions(suggestions);

    expect(useTasteStore.getState().tasteSuggestions).toEqual(suggestions);
    expect(useTasteStore.getState().tasteSuggestionsTimestamp).toBeGreaterThan(
      0,
    );
  });

  it("setTasteSuggestions persists scope when provided", () => {
    useTasteStore
      .getState()
      .setTasteSuggestions(
        [{ id: 1, title: "A", media_type: "movie" } as ContentItem],
        "ai_suggestions_horror",
      );

    expect(useTasteStore.getState().tasteSuggestionsScope).toBe(
      "ai_suggestions_horror",
    );
  });

  it("clearTasteSuggestions resets state to null", () => {
    useTasteStore
      .getState()
      .setTasteSuggestions([
        { id: 1, title: "A", media_type: "movie" } as ContentItem,
      ]);
    useTasteStore.getState().clearTasteSuggestions();

    expect(useTasteStore.getState().tasteSuggestions).toBeNull();
    expect(useTasteStore.getState().tasteSuggestionsTimestamp).toBeNull();
    expect(useTasteStore.getState().tasteSuggestionsScope).toBeNull();
  });
});
