import { describe, expect, it, vi } from "vitest";

import { tasteKeys, tasteSuggestionsQuery } from "./taste.queries";

vi.mock("./taste", () => ({
  tasteService: {
    getAiSuggestions: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
}));

describe("taste.queries", () => {
  it("scopes the cache key by mood and mediaType", () => {
    expect(tasteKeys.all).toEqual(["taste"]);

    const noScope = tasteSuggestionsQuery({
      myList: [],
      watchedIds: [],
      listItemIds: [],
    });
    expect(noScope.queryKey).toEqual(["taste", "default"]);

    const moodScope = tasteSuggestionsQuery({
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "suspense",
    });
    expect(moodScope.queryKey).toEqual(["taste", "suspense"]);

    const fullScope = tasteSuggestionsQuery({
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "dark",
      mediaType: "tv",
    });
    expect(fullScope.queryKey).toEqual(["taste", "dark_tv"]);
  });

  it("uses a 12 hour stale + gc time", () => {
    const query = tasteSuggestionsQuery({
      myList: [],
      watchedIds: [],
      listItemIds: [],
    });
    const twelveHours = 12 * 60 * 60 * 1000;
    expect(query.staleTime).toBe(twelveHours);
    expect(query.gcTime).toBe(twelveHours);
  });

  it("forwards parameters and abort signal to tasteService.getAiSuggestions", async () => {
    const { tasteService } = await import("./taste");
    const controller = new AbortController();
    const myList = [{ id: 1, media_type: "movie", title: "A" }] as never;
    const listItemIds = [{ id: 5, mediaType: "tv" as const }];

    const query = tasteSuggestionsQuery({
      myList,
      watchedIds: [10],
      listItemIds,
      mood: "dark",
      mediaType: "movie",
    });

    await query.queryFn({ signal: controller.signal });

    expect(tasteService.getAiSuggestions).toHaveBeenCalledWith({
      myList,
      watchedIds: [10],
      listItemIds,
      mood: "dark",
      mediaType: "movie",
      signal: controller.signal,
    });
  });
});
