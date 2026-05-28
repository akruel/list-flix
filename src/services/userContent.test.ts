import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "../lib/supabase";
import { userContentService } from "./userContent";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedSupabase = supabase as unknown as {
  auth: { getUser: MockFn };
  from: MockFn;
  rpc: MockFn;
};

const watchlistMetadataKeys = [
  "tmdb_id",
  "media_type",
  "title",
  "name",
  "poster_path",
  "backdrop_path",
  "vote_average",
  "release_date",
  "first_air_date",
  "overview",
] as const;

describe("userContentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockedSupabase.rpc.mockResolvedValue({ error: null });
  });

  it("syncLocalData skips when no authenticated user", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    await userContentService.syncLocalData([], []);

    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("syncLocalData inserts only missing items with full watchlist metadata", async () => {
    const inserts: Record<string, unknown[]> = {};

    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi
        .fn()
        .mockResolvedValue(
          table === "watchlists"
            ? { data: [{ tmdb_id: 10 }] }
            : table === "watched_movies"
              ? { data: [{ tmdb_id: 20 }] }
              : { data: [{ tmdb_episode_id: 1001 }] },
        ),
      insert: vi.fn().mockImplementation((payload: unknown[]) => {
        inserts[table] = payload;
        return Promise.resolve({ error: null });
      }),
    }));

    await userContentService.syncLocalData(
      [
        { id: 10, media_type: "movie", title: "Existing" },
        {
          id: 11,
          media_type: "tv",
          name: "New item",
          poster_path: "/p.jpg",
          backdrop_path: "/b.jpg",
          vote_average: 8.1,
          first_air_date: "2024-01-02",
          overview: "Synopsis",
        },
      ],
      [20, 21],
      {
        50: {
          1001: { season_number: 1, episode_number: 1 },
          1002: { season_number: 1, episode_number: 2 },
        },
      },
    );

    expect(inserts.watchlists).toHaveLength(1);
    expect(inserts.watched_movies).toHaveLength(1);
    expect(inserts.watched_episodes).toHaveLength(1);

    const watchlistInsert = (
      inserts.watchlists as Record<string, unknown>[]
    )[0];
    for (const key of watchlistMetadataKeys) {
      expect(watchlistInsert).toHaveProperty(key);
    }
    expect(watchlistInsert.user_id).toBe("user-1");
    expect(watchlistInsert.tmdb_id).toBe(11);
    expect(watchlistInsert.name).toBe("New item");
    expect(watchlistInsert.poster_path).toBe("/p.jpg");
  });

  it("syncLocalData logs when insert operations return errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({
        error: table === "watchlists" ? new Error("insert failed") : null,
      }),
    }));

    await userContentService.syncLocalData(
      [{ id: 1, media_type: "movie", title: "A" }],
      [1],
      {},
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("getUserContent returns fallback structure on query errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({
        data: [],
        error: table === "watchlists" ? new Error("load failed") : null,
      }),
    }));

    await expect(userContentService.getUserContent()).resolves.toEqual({
      watchlist: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("getUserContent maps watchlist rows directly without lazy lookups", async () => {
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === "watchlists"
          ? {
              data: [
                {
                  tmdb_id: 10,
                  media_type: "movie",
                  title: "Movie",
                  poster_path: "/x.jpg",
                  vote_average: 7.4,
                  release_date: "2024-01-01",
                  overview: "Synopsis",
                },
              ],
              error: null,
            }
          : table === "watched_movies"
            ? { data: [{ tmdb_id: 10 }], error: null }
            : table === "watched_episodes"
              ? {
                  data: [
                    {
                      tmdb_show_id: 100,
                      tmdb_episode_id: 1001,
                      season_number: 1,
                      episode_number: 2,
                    },
                  ],
                  error: null,
                }
              : {
                  data: [
                    { tmdb_id: 100, total_episodes: 10, number_of_seasons: 1 },
                  ],
                  error: null,
                },
      ),
    }));

    const result = await userContentService.getUserContent();

    expect(result.watchlist).toEqual([
      {
        id: 10,
        media_type: "movie",
        title: "Movie",
        name: undefined,
        poster_path: "/x.jpg",
        backdrop_path: undefined,
        vote_average: 7.4,
        release_date: "2024-01-01",
        first_air_date: undefined,
        overview: "Synopsis",
      },
    ]);
    expect(result.watchedIds).toEqual([10]);
    expect(result.watchedEpisodes[100]?.[1001]).toEqual({
      season_number: 1,
      episode_number: 2,
    });
    expect(result.seriesMetadata[100]).toEqual({
      total_episodes: 10,
      number_of_seasons: 1,
    });
  });

  it("getUserContent returns empty watchlist when watchlist data is null", async () => {
    mockedSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const result = await userContentService.getUserContent();

    expect(result.watchlist).toEqual([]);
    expect(result.watchedIds).toEqual([]);
    expect(result.watchedEpisodes).toEqual({});
    expect(result.seriesMetadata).toEqual({});
  });

  it("getUserContent handles null watched and cache rows without crashing", async () => {
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === "watchlists"
          ? {
              data: [
                {
                  tmdb_id: 10,
                  media_type: "movie",
                  title: "Movie",
                },
              ],
              error: null,
            }
          : {
              data: null,
              error: null,
            },
      ),
    }));

    const result = await userContentService.getUserContent();

    expect(result.watchlist).toHaveLength(1);
    expect(result.watchedIds).toEqual([]);
    expect(result.watchedEpisodes).toEqual({});
    expect(result.seriesMetadata).toEqual({});
  });

  it("addToWatchlist persists every metadata column from the input item", async () => {
    let captured: Record<string, unknown> | undefined;
    mockedSupabase.from.mockImplementation(() => ({
      insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        captured = payload;
        return Promise.resolve({ error: null });
      }),
    }));

    await userContentService.addToWatchlist({
      id: 42,
      media_type: "tv",
      title: undefined,
      name: "Show",
      poster_path: "/poster.jpg",
      backdrop_path: "/bd.jpg",
      vote_average: 8.5,
      release_date: undefined,
      first_air_date: "2024-03-04",
      overview: "Plot",
    });

    expect(captured).toBeDefined();
    expect(mockedSupabase.from).toHaveBeenCalledWith("watchlists");
    for (const key of watchlistMetadataKeys) {
      expect(captured).toHaveProperty(key);
    }
    expect(captured?.tmdb_id).toBe(42);
    expect(captured?.media_type).toBe("tv");
    expect(captured?.name).toBe("Show");
    expect(captured?.poster_path).toBe("/poster.jpg");
    expect(captured?.first_air_date).toBe("2024-03-04");
  });

  it.each([
    {
      caseName: "addToWatchlist",
      run: () =>
        userContentService.addToWatchlist({
          id: 1,
          media_type: "movie",
          title: "Movie",
        }),
      expected: true,
    },
    {
      caseName: "removeFromWatchlist",
      run: () => userContentService.removeFromWatchlist(1),
      expected: true,
    },
    {
      caseName: "saveSeriesMetadata",
      run: () =>
        userContentService.saveSeriesMetadata(10, {
          total_episodes: 8,
          number_of_seasons: 1,
        }),
      expected: undefined,
    },
  ])("runs query for $caseName", async ({ run, expected }) => {
    mockedSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        match: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(run()).resolves.toBe(expected);
    expect(mockedSupabase.from).toHaveBeenCalled();
  });

  it.each([
    {
      caseName: "addToWatchlist logs insert error",
      run: () =>
        userContentService.addToWatchlist({
          id: 1,
          media_type: "movie",
          title: "Movie",
        }),
      mockFrom: () => ({
        insert: vi
          .fn()
          .mockResolvedValue({ error: new Error("insert failed") }),
      }),
    },
    {
      caseName: "removeFromWatchlist logs delete error",
      run: () => userContentService.removeFromWatchlist(1),
      mockFrom: () => ({
        delete: vi.fn().mockReturnValue({
          match: vi
            .fn()
            .mockResolvedValue({ error: new Error("delete failed") }),
        }),
      }),
    },
    {
      caseName: "mark movie watched logs error",
      run: () => userContentService.markAsWatched(1, "movie"),
      mockFrom: () => ({
        insert: vi.fn().mockResolvedValue({ error: new Error("movie failed") }),
      }),
    },
    {
      caseName: "mark episode watched logs error",
      run: () =>
        userContentService.markAsWatched(1001, "episode", {
          show_id: 200,
          season_number: 1,
          episode_number: 2,
        }),
      mockFrom: () => ({
        insert: vi
          .fn()
          .mockResolvedValue({ error: new Error("episode failed") }),
      }),
    },
    {
      caseName: "saveSeriesMetadata logs error",
      run: () =>
        userContentService.saveSeriesMetadata(10, {
          total_episodes: 8,
          number_of_seasons: 1,
        }),
      mockFrom: () => ({
        upsert: vi
          .fn()
          .mockResolvedValue({ error: new Error("upsert failed") }),
      }),
    },
  ])("$caseName", async ({ run, mockFrom }) => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation(() => mockFrom());

    await run();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it.each([
    {
      caseName: "addToWatchlist returns false on insert error",
      run: () =>
        userContentService.addToWatchlist({
          id: 1,
          media_type: "movie",
          title: "Movie",
        }),
      mockFrom: () => ({
        insert: vi
          .fn()
          .mockResolvedValue({ error: new Error("insert failed") }),
      }),
    },
    {
      caseName: "removeFromWatchlist returns false on delete error",
      run: () => userContentService.removeFromWatchlist(1),
      mockFrom: () => ({
        delete: vi.fn().mockReturnValue({
          match: vi
            .fn()
            .mockResolvedValue({ error: new Error("delete failed") }),
        }),
      }),
    },
  ])("$caseName", async ({ run, mockFrom }) => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation(() => mockFrom());

    await expect(run()).resolves.toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it.each([
    {
      caseName: "mark movie as watched",
      run: () => userContentService.markAsWatched(1, "movie"),
    },
    {
      caseName: "mark episode as watched",
      run: () =>
        userContentService.markAsWatched(1001, "episode", {
          show_id: 200,
          season_number: 1,
          episode_number: 2,
        }),
    },
  ])("marks content for $caseName", async ({ run }) => {
    mockedSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(run()).resolves.toBeUndefined();
  });

  it("markAsUnwatched runs both movie and episode deletes", async () => {
    const deleteBuilder = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockedSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(deleteBuilder),
    });

    await userContentService.markAsUnwatched(1);

    expect(mockedSupabase.from).toHaveBeenCalledWith("watched_movies");
    expect(mockedSupabase.from).toHaveBeenCalledWith("watched_episodes");
  });

  it("markAsUnwatched logs errors from both delete paths", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation((table: string) => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error:
            table === "watched_movies"
              ? new Error("movie failed")
              : new Error("episode failed"),
        }),
      }),
    }));

    await userContentService.markAsUnwatched(1);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it.each([
    {
      caseName: "mark season watched",
      run: () =>
        userContentService.markSeasonAsWatched(1, 2, [
          { id: 101, episode_number: 1 },
          { id: 102, episode_number: 2 },
        ] as never),
      expectedRpc: "mark_season_watched",
    },
    {
      caseName: "mark season unwatched",
      run: () => userContentService.markSeasonAsUnwatched(1, 2),
      expectedRpc: "mark_season_unwatched",
    },
  ])("calls rpc for $caseName", async ({ run, expectedRpc }) => {
    mockedSupabase.rpc.mockResolvedValue({ error: null });

    await run();

    expect(mockedSupabase.rpc).toHaveBeenCalledWith(
      expectedRpc,
      expect.any(Object),
    );
  });

  it.each([
    {
      caseName: "mark season watched rpc error",
      run: () =>
        userContentService.markSeasonAsWatched(1, 2, [
          { id: 101, episode_number: 1 },
        ] as never),
    },
    {
      caseName: "mark season unwatched rpc error",
      run: () => userContentService.markSeasonAsUnwatched(1, 2),
    },
  ])("logs for $caseName", async ({ run }) => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.rpc.mockResolvedValue({ error: new Error("rpc failed") });

    await run();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it.each([
    {
      caseName: "hasData true",
      counts: [1, 0, 0],
      expected: true,
    },
    {
      caseName: "hasData false",
      counts: [0, 0, 0],
      expected: false,
    },
  ])("returns $caseName", async ({ counts, expected }) => {
    let callIndex = 0;
    mockedSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: counts[callIndex++],
        }),
      }),
    }));

    await expect(userContentService.hasData("user-1")).resolves.toBe(expected);
  });
});
