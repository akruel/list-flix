// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "../services/userContent";
import { useUserContentStore } from "./useUserContentStore";

vi.mock("../services/userContent", () => ({
  userContentService: {
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    markAsWatched: vi.fn(),
    markAsUnwatched: vi.fn(),
    markSeasonAsWatched: vi.fn(),
    markSeasonAsUnwatched: vi.fn(),
    saveSeriesMetadata: vi.fn(),
    syncLocalData: vi.fn(),
    getUserContent: vi.fn().mockResolvedValue({
      watchlist: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    }),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedUserContentService = userContentService as unknown as {
  addToWatchlist: MockFn;
  removeFromWatchlist: MockFn;
  markAsWatched: MockFn;
  markAsUnwatched: MockFn;
  markSeasonAsWatched: MockFn;
  markSeasonAsUnwatched: MockFn;
  saveSeriesMetadata: MockFn;
  syncLocalData: MockFn;
  getUserContent: MockFn;
};

const baselineState = {
  myList: [],
  watchedIds: [],
  watchedEpisodes: {},
  seriesMetadata: {},
};

describe("useUserContentStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useUserContentStore.setState({ ...baselineState });
  });

  it.each([
    { caseName: "movie item", mediaType: "movie" as const },
    { caseName: "tv item", mediaType: "tv" as const },
  ])("adds to watchlist for $caseName", ({ mediaType }) => {
    useUserContentStore.getState().addToList({
      id: 10,
      media_type: mediaType,
      title: "Item",
    });

    expect(useUserContentStore.getState().myList).toEqual([
      {
        id: 10,
        media_type: mediaType,
        title: "Item",
      },
    ]);
    expect(mockedUserContentService.addToWatchlist).toHaveBeenCalledWith({
      id: 10,
      media_type: mediaType,
      title: "Item",
    });
  });

  it("does not add duplicate item to watchlist", () => {
    useUserContentStore.setState({
      myList: [{ id: 10, media_type: "movie", title: "Item" }],
    });

    useUserContentStore.getState().addToList({
      id: 10,
      media_type: "movie",
      title: "Item",
    });

    expect(useUserContentStore.getState().myList).toHaveLength(1);
    expect(mockedUserContentService.addToWatchlist).not.toHaveBeenCalled();
  });

  it("removes from watchlist and calls service", () => {
    useUserContentStore.setState({
      myList: [{ id: 10, media_type: "movie", title: "Item" }],
    });

    useUserContentStore.getState().removeFromList(10);

    expect(useUserContentStore.getState().myList).toEqual([]);
    expect(mockedUserContentService.removeFromWatchlist).toHaveBeenCalledWith(
      10,
    );
  });

  it("checks list membership with isInList", () => {
    useUserContentStore.setState({
      myList: [{ id: 10, media_type: "movie", title: "Item" }],
    });

    expect(useUserContentStore.getState().isInList(10)).toBe(true);
    expect(useUserContentStore.getState().isInList(999)).toBe(false);
  });

  it.each([
    {
      caseName: "movie metadata from myList",
      myList: [{ id: 20, media_type: "movie" as const, title: "Movie" }],
      id: 20,
      expectedType: "movie",
    },
    {
      caseName: "tv metadata from myList",
      myList: [{ id: 30, media_type: "tv" as const, name: "Show" }],
      id: 30,
      expectedType: "tv",
    },
    {
      caseName: "fallback movie when item is missing",
      myList: [],
      id: 99,
      expectedType: "movie",
    },
  ])("markAsWatched handles $caseName", ({ myList, id, expectedType }) => {
    useUserContentStore.setState({
      myList,
      watchedIds: [],
    });

    useUserContentStore.getState().markAsWatched(id);

    expect(useUserContentStore.getState().watchedIds).toContain(id);
    expect(mockedUserContentService.markAsWatched).toHaveBeenCalledWith(
      id,
      expectedType,
    );
  });

  it("does not duplicate watched ids", () => {
    useUserContentStore.setState({
      watchedIds: [10],
    });

    useUserContentStore.getState().markAsWatched(10);

    expect(useUserContentStore.getState().watchedIds).toEqual([10]);
    expect(mockedUserContentService.markAsWatched).not.toHaveBeenCalled();
  });

  it("markAsUnwatched removes watched id and calls service", () => {
    useUserContentStore.setState({
      watchedIds: [10, 20],
    });

    useUserContentStore.getState().markAsUnwatched(10);

    expect(useUserContentStore.getState().watchedIds).toEqual([20]);
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(10);
  });

  it("isWatched reflects watched ids", () => {
    useUserContentStore.setState({
      watchedIds: [10],
    });

    expect(useUserContentStore.getState().isWatched(10)).toBe(true);
    expect(useUserContentStore.getState().isWatched(20)).toBe(false);
  });

  it("marks and unmarks episodes as watched", () => {
    useUserContentStore.getState().markEpisodeAsWatched(1, 101, 2, 3);

    expect(useUserContentStore.getState().watchedEpisodes[1]?.[101]).toEqual({
      season_number: 2,
      episode_number: 3,
    });
    expect(mockedUserContentService.markAsWatched).toHaveBeenCalledWith(
      101,
      "episode",
      {
        show_id: 1,
        season_number: 2,
        episode_number: 3,
      },
    );

    useUserContentStore.getState().markEpisodeAsUnwatched(1, 101);
    expect(useUserContentStore.getState().watchedEpisodes[1]).toEqual({});
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(101);
  });

  it("markEpisodeAsUnwatched handles missing show bucket", () => {
    useUserContentStore.setState({
      watchedEpisodes: {},
    });

    useUserContentStore.getState().markEpisodeAsUnwatched(99, 1001);

    expect(useUserContentStore.getState().watchedEpisodes[99]).toEqual({});
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(1001);
  });

  it("checks episode watched status", () => {
    useUserContentStore.setState({
      watchedEpisodes: {
        1: {
          101: { season_number: 1, episode_number: 1 },
        },
      },
    });

    expect(useUserContentStore.getState().isEpisodeWatched(1, 101)).toBe(true);
    expect(useUserContentStore.getState().isEpisodeWatched(1, 999)).toBe(false);
    expect(useUserContentStore.getState().isEpisodeWatched(99, 101)).toBe(
      false,
    );
  });

  it("does not re-mark an already watched episode", () => {
    useUserContentStore.setState({
      watchedEpisodes: {
        1: {
          101: { season_number: 2, episode_number: 1 },
        },
      },
    });

    useUserContentStore.getState().markEpisodeAsWatched(1, 101, 2, 1);

    expect(mockedUserContentService.markAsWatched).not.toHaveBeenCalled();
  });

  it("marks and unmarks a full season", () => {
    const episodes = [
      {
        id: 101,
        season_number: 1,
        episode_number: 1,
      },
      {
        id: 102,
        season_number: 1,
        episode_number: 2,
      },
    ];

    useUserContentStore.setState({
      watchedEpisodes: {
        1: {
          201: { season_number: 2, episode_number: 1 },
        },
      },
    });

    useUserContentStore.getState().markSeasonAsWatched(1, 1, episodes as never);

    expect(mockedUserContentService.markSeasonAsWatched).toHaveBeenCalledWith(
      1,
      1,
      episodes,
    );
    expect(useUserContentStore.getState().watchedEpisodes[1]?.[101]).toEqual({
      season_number: 1,
      episode_number: 1,
    });

    useUserContentStore.getState().markSeasonAsUnwatched(1, 1);
    expect(mockedUserContentService.markSeasonAsUnwatched).toHaveBeenCalledWith(
      1,
      1,
    );
    expect(useUserContentStore.getState().watchedEpisodes[1]?.[201]).toEqual({
      season_number: 2,
      episode_number: 1,
    });
    expect(
      useUserContentStore.getState().watchedEpisodes[1]?.[101],
    ).toBeUndefined();
  });

  it("markSeasonAsWatched initializes show bucket when absent", () => {
    useUserContentStore.setState({
      watchedEpisodes: {},
    });

    useUserContentStore
      .getState()
      .markSeasonAsWatched(5, 3, [
        { id: 301, season_number: 3, episode_number: 1 },
      ] as never);

    expect(useUserContentStore.getState().watchedEpisodes[5]?.[301]).toEqual({
      season_number: 3,
      episode_number: 1,
    });
  });

  it("markSeasonAsUnwatched handles missing show bucket", () => {
    useUserContentStore.setState({
      watchedEpisodes: {},
    });

    useUserContentStore.getState().markSeasonAsUnwatched(5, 3);

    expect(useUserContentStore.getState().watchedEpisodes[5]).toEqual({});
    expect(mockedUserContentService.markSeasonAsUnwatched).toHaveBeenCalledWith(
      5,
      3,
    );
  });

  it.each([
    {
      caseName: "season progress counts only matching season",
      watchedEpisodes: {
        1: {
          100: { season_number: 1, episode_number: 1 },
          200: { season_number: 2, episode_number: 1 },
          300: { season_number: 3, episode_number: 1 },
        },
      },
      seasonNumber: 1,
      expected: 1,
    },
    {
      caseName: "series progress excludes specials",
      watchedEpisodes: {
        1: {
          100: { season_number: 0, episode_number: 1 },
          200: { season_number: 1, episode_number: 1 },
          300: { season_number: 2, episode_number: 1 },
        },
      },
      seasonNumber: 999,
      expected: 2,
    },
  ])(
    "computes progress for $caseName",
    ({ watchedEpisodes, seasonNumber, expected }) => {
      useUserContentStore.setState({
        watchedEpisodes,
      });

      const state = useUserContentStore.getState();
      expect(
        seasonNumber === 999
          ? state.getSeriesProgress(1)
          : state.getSeasonProgress(1, seasonNumber),
      ).toEqual({ watchedCount: expected });
    },
  );

  it("returns zero progress when show has no watched episodes", () => {
    useUserContentStore.setState({
      watchedEpisodes: {},
    });

    expect(useUserContentStore.getState().getSeasonProgress(999, 1)).toEqual({
      watchedCount: 0,
    });
    expect(useUserContentStore.getState().getSeriesProgress(999)).toEqual({
      watchedCount: 0,
    });
  });

  it("saveSeriesMetadata updates state and syncs remote cache", () => {
    useUserContentStore.getState().saveSeriesMetadata(1, {
      total_episodes: 10,
      number_of_seasons: 2,
    });

    expect(useUserContentStore.getState().seriesMetadata[1]).toEqual({
      total_episodes: 10,
      number_of_seasons: 2,
    });
    expect(useUserContentStore.getState().getSeriesMetadata(1)).toEqual({
      total_episodes: 10,
      number_of_seasons: 2,
    });
    expect(mockedUserContentService.saveSeriesMetadata).toHaveBeenCalledWith(
      1,
      {
        total_episodes: 10,
        number_of_seasons: 2,
      },
    );
  });

  it("syncWithSupabase uploads local state and refreshes from remote source", async () => {
    mockedUserContentService.getUserContent.mockResolvedValue({
      watchlist: [{ id: 1, media_type: "movie", title: "Movie" }],
      watchedIds: [1],
      watchedEpisodes: { 5: { 55: { season_number: 1, episode_number: 1 } } },
      seriesMetadata: { 5: { total_episodes: 8, number_of_seasons: 1 } },
    });

    useUserContentStore.setState({
      myList: [{ id: 9, media_type: "movie", title: "Local" }],
      watchedIds: [9],
      watchedEpisodes: { 9: { 99: { season_number: 1, episode_number: 1 } } },
    });

    await useUserContentStore.getState().syncWithSupabase();

    expect(mockedUserContentService.syncLocalData).toHaveBeenCalledWith(
      [{ id: 9, media_type: "movie", title: "Local" }],
      [9],
      { 9: { 99: { season_number: 1, episode_number: 1 } } },
    );
    expect(useUserContentStore.getState().myList).toEqual([
      { id: 1, media_type: "movie", title: "Movie" },
    ]);
    expect(useUserContentStore.getState().watchedIds).toEqual([1]);
  });
});
