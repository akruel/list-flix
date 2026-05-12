import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "../lib/supabase";
import { tmdb } from "./tmdb";
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

vi.mock("./tmdb", () => ({
  tmdb: {
    getDetails: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedSupabase = supabase as unknown as {
  auth: { getUser: MockFn };
  from: MockFn;
  rpc: MockFn;
};

const mockedTmdb = tmdb as unknown as {
  getDetails: MockFn;
};

function thenableEqChain<T>(result: T) {
  const chain: {
    eq: MockFn;
    then: Promise<T>["then"];
  } = {
    eq: vi.fn(),
    then: vi.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

function makeUserListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "uuid-1",
    user_id: "user-1",
    tmdb_id: 10,
    media_type: "movie",
    title: "Movie",
    name: null,
    poster_path: null,
    backdrop_path: null,
    vote_average: null,
    release_date: null,
    first_air_date: null,
    overview: null,
    created_at: "2026-01-01T00:00:00Z",
    user_list_tags: [],
    ...overrides,
  };
}

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

  it("syncLocalData inserts only missing items", async () => {
    const inserts: Record<string, unknown[]> = {};

    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi
        .fn()
        .mockResolvedValue(
          table === "user_list"
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
        { id: 11, media_type: "tv", name: "New item" },
      ],
      [20, 21],
      {
        50: {
          1001: { season_number: 1, episode_number: 1 },
          1002: { season_number: 1, episode_number: 2 },
        },
      },
    );

    expect(inserts.user_list).toHaveLength(1);
    expect(inserts.watched_movies).toHaveLength(1);
    expect(inserts.watched_episodes).toHaveLength(1);
  });

  it("syncLocalData logs when insert operations return errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({
        error: table === "user_list" ? new Error("insert failed") : null,
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
        error: table === "user_list" ? new Error("load failed") : null,
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

  it("getUserContent maps rows without self-heal when metadata exists", async () => {
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === "user_list"
          ? {
              data: [makeUserListRow()],
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

    expect(result.watchlist).toHaveLength(1);
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

  it("getUserContent handles null watched and cache rows without crashing", async () => {
    mockedSupabase.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === "user_list"
          ? {
              data: [makeUserListRow()],
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

  it.each([
    {
      caseName: "self-heal success",
      getDetailsError: null,
      expectedTitle: "Healed title",
    },
    {
      caseName: "self-heal fallback on tmdb error",
      getDetailsError: new Error("tmdb failed"),
      expectedTitle: "Error loading",
    },
  ])(
    "getUserContent handles $caseName",
    async ({ getDetailsError, expectedTitle }) => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "user_list") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                makeUserListRow({
                  tmdb_id: 55,
                  title: null,
                  name: null,
                }),
              ],
              error: null,
            }),
            update: vi.fn().mockImplementation(() =>
              thenableEqChain({
                data: null,
                error: null,
              }),
            ),
          };
        }

        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      if (getDetailsError) {
        mockedTmdb.getDetails.mockRejectedValue(getDetailsError);
      } else {
        mockedTmdb.getDetails.mockResolvedValue({
          id: 55,
          media_type: "movie",
          title: "Healed title",
          poster_path: "/healed.jpg",
        });
      }

      const result = await userContentService.getUserContent();

      expect(result.watchlist[0]?.title).toBe(expectedTitle);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(getDetailsError ? 1 : 0);
      if (!getDetailsError) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const logMatcher = expect.stringContaining("[ListFlix INFO]");
      expect(consoleLogSpy.mock.calls).toEqual(
        getDetailsError ? [] : [[logMatcher, "Self-healed 1 user list items"]],
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    },
  );

  it("runs query for addToList", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "new-uuid", tmdb_id: 1, media_type: "movie" },
      error: null,
    });
    mockedSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    });

    const result = await userContentService.addToList({
      id: 1,
      media_type: "movie",
    });

    expect(result).toEqual({ id: "new-uuid", tmdb_id: 1, media_type: "movie" });
    expect(mockedSupabase.from).toHaveBeenCalledWith("user_list");
  });

  it("runs query for removeFromList", async () => {
    mockedSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        match: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await expect(userContentService.removeFromList(1)).resolves.toBeUndefined();
    expect(mockedSupabase.from).toHaveBeenCalledWith("user_list");
  });

  it("runs query for saveSeriesMetadata", async () => {
    mockedSupabase.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(
      userContentService.saveSeriesMetadata(10, {
        total_episodes: 8,
        number_of_seasons: 1,
      }),
    ).resolves.toBeUndefined();
    expect(mockedSupabase.from).toHaveBeenCalledWith("series_cache");
  });

  it.each([
    {
      caseName: "addToList logs insert error",
      run: () => userContentService.addToList({ id: 1, media_type: "movie" }),
      mockFrom: () => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("insert failed"),
            }),
          }),
        }),
      }),
    },
    {
      caseName: "removeFromList logs delete error",
      run: () => userContentService.removeFromList(1),
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
