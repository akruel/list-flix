import { describe, expect, it, vi } from "vitest";

import { tasteKeys, tasteSuggestionsQuery } from "./taste.queries";

vi.mock("./taste", () => ({
  tasteService: {
    getAiSuggestions: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
}));

describe("taste.queries", () => {
  it("scopes the cache key by userId, mood and mediaType", () => {
    expect(tasteKeys.all).toEqual(["taste"]);

    const noScope = tasteSuggestionsQuery({
      userId: "u1",
      myList: [],
      watchedIds: [],
      listItemIds: [],
    });
    expect(noScope.queryKey).toEqual(["taste", "u1", "default"]);

    const moodScope = tasteSuggestionsQuery({
      userId: "u1",
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "suspense",
    });
    expect(moodScope.queryKey).toEqual(["taste", "u1", "suspense"]);

    const fullScope = tasteSuggestionsQuery({
      userId: "u1",
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "dark",
      mediaType: "tv",
    });
    expect(fullScope.queryKey).toEqual(["taste", "u1", "dark_tv"]);
  });

  it("isolates cache entries between users", () => {
    const userA = tasteSuggestionsQuery({
      userId: "user-a",
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "suspense",
    });
    const userB = tasteSuggestionsQuery({
      userId: "user-b",
      myList: [],
      watchedIds: [],
      listItemIds: [],
      mood: "suspense",
    });

    expect(userA.queryKey).not.toEqual(userB.queryKey);
  });

  it("uses a 12 hour stale + gc time", () => {
    const query = tasteSuggestionsQuery({
      userId: "u1",
      myList: [],
      watchedIds: [],
      listItemIds: [],
    });
    const twelveHours = 12 * 60 * 60 * 1000;
    expect(query.staleTime).toBe(twelveHours);
    expect(query.gcTime).toBe(twelveHours);
  });

  it("forwards parameters and abort signal to tasteService.getAiSuggestions (without userId)", async () => {
    const { tasteService } = await import("./taste");
    const controller = new AbortController();
    const myList = [{ id: 1, media_type: "movie", title: "A" }] as never;
    const listItemIds = [{ id: 5, mediaType: "tv" as const }];

    const query = tasteSuggestionsQuery({
      userId: "u1",
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
