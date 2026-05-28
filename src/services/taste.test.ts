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

beforeEach(() => {
  vi.clearAllMocks();
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
      const result = await tasteService.getAiSuggestions({
        myList: [],
        watchedIds: [],
        listItemIds: [],
      });

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

      const result = await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [],
        listItemIds: [],
      });

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

      const result = await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [1],
        listItemIds: [],
      });

      expect(result).toHaveLength(0);
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

      await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [],
        listItemIds: [],
        mood: "suspense",
      });

      const callArgs = vi.mocked(ai.getSuggestions).mock.calls[0][0];
      expect(callArgs).toContain("mood for suspense");
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

      const result = await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [],
        listItemIds: [],
      });

      expect(result).toEqual([]);
    });

    it("re-throws AI errors so React Query can retry and avoid caching empty", async () => {
      const { tmdb } = await import("./tmdb");
      const { ai } = await import("./ai");

      vi.mocked(tmdb.getDetails).mockResolvedValue({
        ...mockMovieItem,
        genres: [{ id: 28, name: "Action" }],
      } as never);

      vi.mocked(ai.getSuggestions).mockRejectedValue(new Error("AI failed"));

      await expect(
        tasteService.getAiSuggestions({
          myList: [mockMovieItem],
          watchedIds: [],
          listItemIds: [],
        }),
      ).rejects.toThrow("AI failed");
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

      const result = await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [],
        listItemIds: [],
        mediaType: "tv",
      });

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

      const result = await tasteService.getAiSuggestions({
        myList: [mockMovieItem],
        watchedIds: [],
        listItemIds: [],
        mediaType: "movie",
      });

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
        tasteService.getAiSuggestions({
          myList: [mockMovieItem],
          watchedIds: [],
          listItemIds: [],
        }),
      ).rejects.toThrow("Aborted");
    });
  });
});
