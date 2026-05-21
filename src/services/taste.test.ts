import { beforeEach, describe, expect, it, vi } from "vitest";

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

    it("handles errors gracefully", async () => {
      const { tmdb } = await import("./tmdb");

      vi.mocked(tmdb.getDetails).mockRejectedValue(new Error("API error"));

      const result = await tasteService.getPersonalizedSuggestions(
        [mockMovieItem],
        [],
        [],
      );

      expect(result).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("clears taste suggestions via store", () => {
      tasteService.clearCache();

      expect(mockStore.clearTasteSuggestions).toHaveBeenCalled();
    });
  });
});
