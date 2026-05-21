import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentItem } from "../types";

vi.mock("./tmdb", () => ({
  tmdb: {
    getDetails: vi.fn(),
    discover: vi.fn(),
    findBestMatch: vi.fn(),
  },
}));

vi.mock("./ai", () => ({
  ai: {
    getSuggestions: vi.fn(),
  },
}));

let mockStore: {
  tasteSuggestions: ContentItem[] | null;
  tasteSuggestionsTimestamp: number | null;
  setTasteSuggestions: ReturnType<typeof vi.fn>;
  clearTasteSuggestions: ReturnType<typeof vi.fn>;
};

vi.mock("../store/useStore", () => ({
  useStore: {
    getState: () => mockStore,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockStore = {
    tasteSuggestions: null,
    tasteSuggestionsTimestamp: null,
    setTasteSuggestions: vi.fn(),
    clearTasteSuggestions: vi.fn(),
  };

  const mockStorage: Record<string, string> = {};
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  });
});

import { tasteService } from "./taste";

const mockMovieItem: ContentItem = {
  id: 1,
  title: "Mock Movie",
  media_type: "movie",
  vote_average: 7.5,
  release_date: "2020-01-01",
};

describe("tasteService", () => {
  describe("getProfile", () => {
    it("returns genre names and titles from myList", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [
          { id: 28, name: "Action" },
          { id: 12, name: "Adventure" },
        ],
      } as never);

      const profile = await tasteService.getProfile([mockMovieItem]);

      expect(profile.genreNames).toEqual(["Action", "Adventure"]);
      expect(profile.recentTitles).toContain("Mock Movie");
    });

    it("returns empty profile when myList is empty", async () => {
      const profile = await tasteService.getProfile([]);

      expect(profile.genreNames).toEqual([]);
      expect(profile.recentTitles).toEqual([]);
    });

    it("handles aborted signal", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        tasteService.getProfile([mockMovieItem], controller.signal),
      ).rejects.toThrow("Aborted");
    });

    it("handles missing title in details", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        id: 1,
        genres: [{ id: 28, name: "Action" }],
        title: null,
        name: undefined,
        media_type: "movie",
        vote_average: 7.5,
      } as never);

      const profile = await tasteService.getProfile([mockMovieItem]);

      expect(profile.recentTitles).toEqual([]);
    });
  });

  describe("getAiSuggestions", () => {
    it("returns empty array when no items to analyze", async () => {
      const result = await tasteService.getAiSuggestions([], [], []);

      expect(result).toEqual([]);
    });

    it("fetches AI suggestions and finds best TMDB matches", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "For You",
        items: [
          {
            title: "Recommended Movie",
            year: 2020,
            media_type: "movie" as const,
          },
        ],
      });

      vi.mocked(tmdb.findBestMatch).mockResolvedValue({
        id: 101,
        title: "Recommended Movie",
        media_type: "movie",
      } as ContentItem);

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(ai.getSuggestions).toHaveBeenCalledTimes(1);
      expect(tmdb.findBestMatch).toHaveBeenCalledWith(
        "Recommended Movie",
        "movie",
        2020,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(101);
    });

    it("filters out known items", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "For You",
        items: [
          {
            title: "Already Watched",
            year: 2020,
            media_type: "movie" as const,
          },
        ],
      });

      vi.mocked(tmdb.findBestMatch).mockResolvedValue({
        id: 1,
        title: "Already Watched",
        media_type: "movie",
      } as ContentItem);

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [1],
        [],
      );

      expect(result).toHaveLength(0);
    });

    it("uses cached suggestions within TTL", async () => {
      mockStore.tasteSuggestions = [
        { id: 101, title: "Cached Item", media_type: "movie" } as ContentItem,
      ];
      mockStore.tasteSuggestionsTimestamp = Date.now();

      const { ai } = await import("./ai");
      const { tmdb } = await import("./tmdb");

      const cachedResult = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(ai.getSuggestions).not.toHaveBeenCalled();
      expect(tmdb.getDetails).not.toHaveBeenCalled();
      expect(cachedResult).toHaveLength(1);
      expect(cachedResult[0].id).toBe(101);
    });

    it("passes mood context to AI prompt", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "Mood List",
        items: [
          { title: "Mood Item", year: 2022, media_type: "movie" as const },
        ],
      });

      vi.mocked(tmdb.findBestMatch).mockResolvedValue({
        id: 201,
        title: "Mood Item",
        media_type: "movie",
      } as ContentItem);

      await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
        undefined,
        "suspense",
      );

      const callArgs = vi.mocked(ai.getSuggestions).mock.calls[0][0];
      expect(callArgs).toContain("mood for suspense");
    });

    it("uses sessionStorage cache for mood context", async () => {
      const { ai } = await import("./ai");
      const { tmdb } = await import("./tmdb");

      const cachedItems = [
        { id: 301, title: "Cached Mood Item", media_type: "movie" },
      ] as ContentItem[];

      sessionStorage.setItem(
        "ai_suggestions_suspense",
        JSON.stringify({ items: cachedItems, ts: Date.now() }),
      );

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
        undefined,
        "suspense",
      );

      expect(ai.getSuggestions).not.toHaveBeenCalled();
      expect(tmdb.getDetails).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(301);
      expect(mockStore.setTasteSuggestions).toHaveBeenCalledWith(cachedItems);
    });

    it("works with empty recent titles", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        id: 1,
        genres: [{ id: 28, name: "Action" }],
        title: "",
        name: "",
        media_type: "movie",
        vote_average: 7.5,
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "For You",
        items: [],
      });

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toEqual([]);
    });

    it("handles AI errors gracefully", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockRejectedValue(new Error("AI failed"));

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toEqual([]);
    });

    it("filters suggestions by media type context", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "For You",
        items: [
          { title: "Movie Title", year: 2020, media_type: "movie" as const },
          { title: "Show Title", year: 2021, media_type: "tv" as const },
        ],
      });

      vi.mocked(tmdb.findBestMatch)
        .mockResolvedValueOnce({
          id: 101,
          title: "Movie Title",
          media_type: "movie",
        } as ContentItem)
        .mockResolvedValueOnce({
          id: 202,
          name: "Show Title",
          media_type: "tv",
        } as ContentItem);

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
        undefined,
        undefined,
        "tv",
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(202);
      expect(result[0].media_type).toBe("tv");
    });

    it("filters suggestions by movie media type and includes in prompt", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockResolvedValue({
        suggested_list_name: "For You",
        items: [
          { title: "Movie Item", year: 2022, media_type: "movie" as const },
        ],
      });

      vi.mocked(tmdb.findBestMatch).mockResolvedValue({
        id: 401,
        title: "Movie Item",
        media_type: "movie",
      } as ContentItem);

      const result = await tasteService.getAiSuggestions(
        [mockMovieItem],
        [],
        [],
        undefined,
        undefined,
        "movie",
      );

      const callArgs = vi.mocked(ai.getSuggestions).mock.calls[0][0];
      expect(callArgs).toContain("movies I would enjoy.");
      expect(callArgs).not.toContain("movies and TV shows I would enjoy");
      expect(result).toHaveLength(1);
      expect(result[0].media_type).toBe("movie");
    });

    it("re-throws AbortError from AI call", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockRejectedValue(
        new DOMException("Aborted", "AbortError"),
      );

      await expect(
        tasteService.getAiSuggestions([mockMovieItem], [], []),
      ).rejects.toThrow("Aborted");
    });
  });

  describe("getPersonalizedSuggestions", () => {
    it("returns empty array when no items to analyze", async () => {
      const result = await tasteService.getPersonalizedSuggestions([], [], []);

      expect(result).toEqual([]);
    });

    it("fetches genres and discovers content based on user taste", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [
          { id: 28, name: "Action" },
          { id: 12, name: "Adventure" },
        ],
      } as never);

      vi.mocked(tmdb.discover).mockResolvedValue([
        {
          id: 101,
          title: "Recommended 1",
          media_type: "movie",
          vote_average: 7.0,
        },
        {
          id: 102,
          title: "Recommended 2",
          media_type: "movie",
          vote_average: 8.0,
        },
      ] as ContentItem[]);

      const result = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [999],
        [],
      );

      expect(tmdb.getDetails).toHaveBeenCalledTimes(1);
      expect(tmdb.discover).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(101);
    });

    it("filters out items already in watched or myList", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(tmdb.discover).mockResolvedValue([
        { id: 1, title: "Already in list", media_type: "movie" },
        { id: 101, title: "New item", media_type: "movie" },
      ] as ContentItem[]);

      const result = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(101);
    });

    it("aggregates genre counts across multiple items", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails)
        .mockResolvedValueOnce({
          ...mockMovieItem,
          genres: [{ id: 28, name: "Action" }],
        } as never)
        .mockResolvedValueOnce({
          id: 2,
          title: "Another",
          media_type: "movie",
          genres: [
            { id: 28, name: "Action" },
            { id: 12, name: "Adventure" },
          ],
          vote_average: 7.0,
        } as never);

      vi.mocked(tmdb.discover).mockResolvedValue([
        { id: 101, title: "Recommended", media_type: "movie" },
      ] as ContentItem[]);

      const result = await tasteService.getPersonalizedSuggestions(
        [
          mockMovieItem,
          { id: 2, title: "Another", media_type: "movie" } as ContentItem,
        ],
        [],
        [],
      );

      expect(result).toHaveLength(1);
    });

    it("uses cached suggestions within TTL", async () => {
      mockStore.tasteSuggestions = [
        { id: 101, title: "Cached", media_type: "movie" } as ContentItem,
      ];
      mockStore.tasteSuggestionsTimestamp = Date.now();

      const { tmdb } = await import("./tmdb");

      const cachedResult = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(tmdb.getDetails).not.toHaveBeenCalled();
      expect(cachedResult).toHaveLength(1);
      expect(cachedResult[0].id).toBe(101);
    });

    it("handles getDetails errors gracefully", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockRejectedValue(new Error("API error"));

      const result = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toEqual([]);
    });

    it("handles discovery errors gracefully", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(tmdb.discover).mockRejectedValue(new Error("Discover failed"));

      const result = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toEqual([]);
    });

    it("handles aborted signal before getDetails", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        tasteService.getPersonalizedSuggestions(
          [mockMovieItem],
          [],
          [],
          controller.signal,
        ),
      ).rejects.toThrow("Aborted");
    });

    it("re-throws AbortError from discover call", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(tmdb.discover).mockRejectedValue(
        new DOMException("Aborted", "AbortError"),
      );

      await expect(
        tasteService.getPersonalizedSuggestions([mockMovieItem], [], []),
      ).rejects.toThrow("Aborted");
    });
  });

  describe("clearCache", () => {
    it("clears taste suggestions via store", () => {
      tasteService.clearCache();

      expect(mockStore.clearTasteSuggestions).toHaveBeenCalled();
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
