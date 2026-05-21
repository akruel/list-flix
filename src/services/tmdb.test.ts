import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  const create = vi.fn(() => ({ get }));
  return { get, create };
});

vi.mock("axios", () => ({
  default: {
    create: mocks.create,
  },
  create: mocks.create,
}));

import { tmdb } from "./tmdb";

describe("tmdb service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockReturnValue({ get: mocks.get });
  });

  it.each([
    {
      caseName: "default week",
      timeWindow: undefined,
      expectedPath: "/trending/all/week",
    },
    {
      caseName: "day window",
      timeWindow: "day" as const,
      expectedPath: "/trending/all/day",
    },
  ])("gets trending for $caseName", async ({ timeWindow, expectedPath }) => {
    mocks.get.mockResolvedValue({
      data: {
        results: [{ id: 1, media_type: "movie" }],
      },
    });

    const result = timeWindow
      ? await tmdb.getTrending(timeWindow)
      : await tmdb.getTrending();

    expect(mocks.get).toHaveBeenCalledWith(expectedPath);
    expect(result).toEqual([{ id: 1, media_type: "movie" }]);
  });

  it.each([
    {
      caseName: "first person id",
      results: [{ id: 101 }, { id: 102 }],
      expected: 101,
    },
    {
      caseName: "no people found",
      results: [],
      expected: null,
    },
  ])("searchPerson returns $caseName", async ({ results, expected }) => {
    mocks.get.mockResolvedValue({
      data: { results },
    });

    await expect(tmdb.searchPerson("tom cruise")).resolves.toBe(expected);
    expect(mocks.get).toHaveBeenCalledWith("/search/person", {
      params: { query: "tom cruise" },
    });
  });

  it("search filters non movie/tv entries", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, media_type: "movie" },
          { id: 2, media_type: "tv" },
          { id: 3, media_type: "person" },
        ],
      },
    });

    const response = await tmdb.search("matrix");

    expect(response.results).toEqual([
      { id: 1, media_type: "movie" },
      { id: 2, media_type: "tv" },
    ]);
  });

  it.each([
    { caseName: "movie details", type: "movie" as const, id: 10 },
    { caseName: "tv details", type: "tv" as const, id: 20 },
  ])("getDetails returns $caseName with media_type", async ({ type, id }) => {
    mocks.get.mockResolvedValue({
      data: { id, title: "Title" },
    });

    const result = await tmdb.getDetails(id, type);

    expect(mocks.get).toHaveBeenCalledWith(`/${type}/${id}`, {
      params: {
        append_to_response: "credits,videos,watch/providers",
      },
    });
    expect(result).toMatchObject({ id, media_type: type });
  });

  it("getSeasonDetails loads tv season endpoint", async () => {
    mocks.get.mockResolvedValue({
      data: { id: 1, episodes: [] },
    });

    await expect(tmdb.getSeasonDetails(33, 2)).resolves.toEqual({
      id: 1,
      episodes: [],
    });
    expect(mocks.get).toHaveBeenCalledWith("/tv/33/season/2");
  });

  it.each([
    {
      caseName: "fallback image for empty path",
      path: null,
      size: undefined,
      expected: "https://via.placeholder.com/500x750?text=No+Image",
    },
    {
      caseName: "default size image",
      path: "/poster.jpg",
      size: undefined,
      expected: "https://image.tmdb.org/t/p/w500/poster.jpg",
    },
    {
      caseName: "custom size image",
      path: "/poster.jpg",
      size: "w300" as const,
      expected: "https://image.tmdb.org/t/p/w300/poster.jpg",
    },
  ])("getImageUrl handles $caseName", ({ path, size, expected }) => {
    const result = size ? tmdb.getImageUrl(path, size) : tmdb.getImageUrl(path);
    expect(result).toBe(expected);
  });

  it("getGenres combines and deduplicates movie/tv genres", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          genres: [
            { id: 1, name: "Action" },
            { id: 2, name: "Drama" },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          genres: [
            { id: 2, name: "Drama" },
            { id: 3, name: "Comedy" },
          ],
        },
      });

    await expect(tmdb.getGenres()).resolves.toEqual([
      { id: 1, name: "Action" },
      { id: 2, name: "Drama" },
      { id: 3, name: "Comedy" },
    ]);
  });

  it("search filters by media type when provided", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, media_type: "movie" },
          { id: 2, media_type: "tv" },
          { id: 3, media_type: "person" },
        ],
      },
    });

    const response = await tmdb.search("matrix", { mediaType: "movie" });

    expect(response.results).toEqual([{ id: 1, media_type: "movie" }]);
  });

  it("search passes signal to axios", async () => {
    mocks.get.mockResolvedValue({ data: { results: [] } });
    const controller = new AbortController();

    await tmdb.search("test", { signal: controller.signal });

    expect(mocks.get).toHaveBeenCalledWith(
      "/search/multi",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  describe("findBestMatch", () => {
    it("returns first result when no year provided", async () => {
      mocks.get.mockResolvedValue({
        data: {
          results: [
            { id: 1, title: "Matrix", media_type: "movie" },
            { id: 2, title: "Matrix Reloaded", media_type: "movie" },
          ],
        },
      });

      const result = await tmdb.findBestMatch("Matrix", "movie");
      expect(result).toEqual({ id: 1, title: "Matrix", media_type: "movie" });
    });

    it("searches by title only, then matches year from results", async () => {
      mocks.get.mockResolvedValue({
        data: { results: [{ id: 1, title: "Matrix", media_type: "movie" }] },
      });

      await tmdb.findBestMatch("Matrix", "movie", 1999);
      expect(mocks.get).toHaveBeenCalledWith(
        "/search/multi",
        expect.objectContaining({
          params: expect.objectContaining({ query: "Matrix" }),
        }),
      );
    });

    it("returns matching result by year from results", async () => {
      mocks.get.mockResolvedValue({
        data: {
          results: [
            {
              id: 2,
              title: "The Matrix",
              media_type: "movie",
              release_date: "2003-05-15",
            },
            {
              id: 1,
              title: "The Matrix",
              media_type: "movie",
              release_date: "1999-03-31",
            },
          ],
        },
      });

      const result = await tmdb.findBestMatch("The Matrix", "movie", 1999);
      expect(result?.id).toBe(1);
    });

    it("returns first result when year provided but no match found", async () => {
      mocks.get.mockResolvedValue({
        data: {
          results: [
            {
              id: 2,
              title: "The Matrix",
              media_type: "movie",
              release_date: "2003-05-15",
            },
          ],
        },
      });

      const result = await tmdb.findBestMatch("The Matrix", "movie", 1999);
      expect(result?.id).toBe(2);
    });

    it("returns null when search returns empty results", async () => {
      mocks.get.mockResolvedValue({
        data: { results: [] },
      });

      const result = await tmdb.findBestMatch("Unknown Movie", "movie");
      expect(result).toBeNull();
    });

    it("matches TV series by first_air_date year", async () => {
      mocks.get.mockResolvedValue({
        data: {
          results: [
            {
              id: 3,
              name: "The Office",
              media_type: "tv",
              first_air_date: "2005-03-24",
            },
          ],
        },
      });

      const result = await tmdb.findBestMatch("The Office", "tv", 2005);
      expect(result?.id).toBe(3);
    });
  });

  it("getGenres returns cached data when within TTL", async () => {
    vi.resetModules();
    const { tmdb: freshTmdb } = await import("./tmdb");

    mocks.get
      .mockResolvedValueOnce({
        data: { genres: [{ id: 1, name: "Action" }] },
      })
      .mockResolvedValueOnce({
        data: { genres: [{ id: 2, name: "Drama" }] },
      });
    await freshTmdb.getGenres();

    mocks.get.mockClear();
    const result = await freshTmdb.getGenres();

    expect(mocks.get).not.toHaveBeenCalled();
    expect(result).toEqual([
      { id: 1, name: "Action" },
      { id: 2, name: "Drama" },
    ]);
  });

  it.each([
    {
      caseName: "movie discover default",
      filters: { with_genres: "28" },
      expectedPath: "/discover/movie",
      expectedMediaType: "movie",
      expectedSortBy: "popularity.desc",
    },
    {
      caseName: "tv discover keeps explicit sort",
      filters: { media_type: "tv", sort_by: "vote_average.desc" },
      expectedPath: "/discover/tv",
      expectedMediaType: "tv",
      expectedSortBy: "vote_average.desc",
    },
  ])(
    "discover handles $caseName",
    async ({ filters, expectedPath, expectedMediaType, expectedSortBy }) => {
      mocks.get.mockResolvedValue({
        data: {
          results: [{ id: 100, title: "X" }],
        },
      });

      const result = await tmdb.discover(filters);

      expect(mocks.get).toHaveBeenCalledWith(expectedPath, {
        params: expect.objectContaining({
          sort_by: expectedSortBy,
        }),
      });
      expect(result).toEqual([
        {
          id: 100,
          title: "X",
          media_type: expectedMediaType,
        },
      ]);
    },
  );

  it("discover passes signal to axios", async () => {
    mocks.get.mockResolvedValue({ data: { results: [] } });
    const controller = new AbortController();

    await tmdb.discover({}, controller.signal);

    expect(mocks.get).toHaveBeenCalledWith(
      "/discover/movie",
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
