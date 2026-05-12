// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "../services/userContent";
import { useStore } from "./useStore";

vi.mock("../services/userContent", () => ({
  userContentService: {
    addToList: vi.fn(),
    addToListWithTags: vi.fn(),
    removeFromList: vi.fn(),
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
  addToList: MockFn;
  addToListWithTags: MockFn;
  removeFromList: MockFn;
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
  seasonCache: {},
  activeTags: [],
};

describe("useStore list actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useStore.setState({ ...baselineState });
  });

  it.each([
    { caseName: "movie item", mediaType: "movie" as const },
    { caseName: "tv item", mediaType: "tv" as const },
  ])("adds to list for $caseName", ({ mediaType }) => {
    useStore.getState().addToList({
      id: 10,
      media_type: mediaType,
      title: "Item",
    });

    const myList = useStore.getState().myList;
    expect(myList).toHaveLength(1);
    expect(myList[0]?.tmdb_id).toBe(10);
    expect(myList[0]?.media_type).toBe(mediaType);
    expect(myList[0]?.title).toBe("Item");

    expect(mockedUserContentService.addToList).toHaveBeenCalledWith({
      id: 10,
      media_type: mediaType,
      title: "Item",
    });
  });

  it("does not add duplicate item", () => {
    useStore.setState({
      myList: [
        {
          id: "temp_10",
          user_id: "",
          tmdb_id: 10,
          media_type: "movie",
          title: "Item",
          tags: [],
          created_at: "",
        },
      ],
    });

    useStore.getState().addToList({
      id: 10,
      media_type: "movie",
      title: "Item",
    });

    expect(useStore.getState().myList).toHaveLength(1);
    expect(mockedUserContentService.addToList).not.toHaveBeenCalled();
  });

  it("removes from list and calls service", () => {
    useStore.setState({
      myList: [
        {
          id: "temp_10",
          user_id: "",
          tmdb_id: 10,
          media_type: "movie",
          title: "Item",
          tags: [],
          created_at: "",
        },
      ],
    });

    useStore.getState().removeFromList(10);

    expect(useStore.getState().myList).toEqual([]);
    expect(mockedUserContentService.removeFromList).toHaveBeenCalledWith(10);
  });

  it("checks list membership with isInList", () => {
    useStore.setState({
      myList: [
        {
          id: "temp_10",
          user_id: "",
          tmdb_id: 10,
          media_type: "movie",
          title: "Item",
          tags: [],
          created_at: "",
        },
      ],
    });

    expect(useStore.getState().isInList(10)).toBe(true);
    expect(useStore.getState().isInList(999)).toBe(false);
  });

  it.each([
    {
      caseName: "movie metadata from myList",
      myList: [
        {
          id: "temp_20",
          user_id: "",
          tmdb_id: 20,
          media_type: "movie" as const,
          title: "Movie",
          tags: [],
          created_at: "",
        },
      ],
      id: 20,
      expectedType: "movie",
    },
    {
      caseName: "tv metadata from myList",
      myList: [
        {
          id: "temp_30",
          user_id: "",
          tmdb_id: 30,
          media_type: "tv" as const,
          name: "Show",
          tags: [],
          created_at: "",
        },
      ],
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
    useStore.setState({
      myList,
      watchedIds: [],
    });

    useStore.getState().markAsWatched(id);

    expect(useStore.getState().watchedIds).toContain(id);
    expect(mockedUserContentService.markAsWatched).toHaveBeenCalledWith(
      id,
      expectedType,
      expect.any(Object),
    );
  });

  it("does not duplicate watched ids", () => {
    useStore.setState({ watchedIds: [10] });
    useStore.getState().markAsWatched(10);
    expect(useStore.getState().watchedIds).toEqual([10]);
    expect(mockedUserContentService.markAsWatched).not.toHaveBeenCalled();
  });

  it("markAsUnwatched removes watched id and calls service", () => {
    useStore.setState({ watchedIds: [10, 20] });
    useStore.getState().markAsUnwatched(10);
    expect(useStore.getState().watchedIds).toEqual([20]);
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(10);
  });

  it("isWatched reflects watched ids", () => {
    useStore.setState({ watchedIds: [10] });
    expect(useStore.getState().isWatched(10)).toBe(true);
    expect(useStore.getState().isWatched(20)).toBe(false);
  });

  it("marks and unmarks episodes", () => {
    useStore.getState().markEpisodeAsWatched(1, 101, 2, 3);
    expect(useStore.getState().watchedEpisodes[1]?.[101]).toEqual({
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

    useStore.getState().markEpisodeAsUnwatched(1, 101);
    expect(useStore.getState().watchedEpisodes[1]).toEqual({});
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(101);
  });

  it("checks episode watched status", () => {
    useStore.setState({
      watchedEpisodes: { 1: { 101: { season_number: 1, episode_number: 1 } } },
    });
    expect(useStore.getState().isEpisodeWatched(1, 101)).toBe(true);
    expect(useStore.getState().isEpisodeWatched(1, 999)).toBe(false);
  });

  it("saveSeriesMetadata updates state and syncs", () => {
    useStore
      .getState()
      .saveSeriesMetadata(1, { total_episodes: 10, number_of_seasons: 2 });
    expect(useStore.getState().seriesMetadata[1]).toEqual({
      total_episodes: 10,
      number_of_seasons: 2,
    });
    expect(mockedUserContentService.saveSeriesMetadata).toHaveBeenCalledWith(
      1,
      { total_episodes: 10, number_of_seasons: 2 },
    );
  });

  it("syncWithSupabase uploads and refreshes", async () => {
    mockedUserContentService.getUserContent.mockResolvedValue({
      watchlist: [
        {
          id: "uuid-1",
          user_id: "user-1",
          tmdb_id: 1,
          media_type: "movie",
          title: "Movie",
          tags: [],
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      watchedIds: [1],
      watchedEpisodes: {},
      seriesMetadata: {},
    });

    useStore.setState({
      myList: [
        {
          id: "temp_9",
          user_id: "",
          tmdb_id: 9,
          media_type: "movie",
          title: "Local",
          tags: [],
          created_at: "",
        },
      ],
      watchedIds: [9],
    });

    await useStore.getState().syncWithSupabase();

    expect(mockedUserContentService.syncLocalData).toHaveBeenCalled();
    expect(useStore.getState().myList).toEqual([
      {
        id: "uuid-1",
        user_id: "user-1",
        tmdb_id: 1,
        media_type: "movie",
        title: "Movie",
        tags: [],
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(useStore.getState().watchedIds).toEqual([1]);
  });

  it("toggleTag adds and removes tags from activeTags", () => {
    expect(useStore.getState().activeTags).toEqual([]);
    useStore.getState().toggleTag("noite_de_pipoca");
    expect(useStore.getState().activeTags).toEqual(["noite_de_pipoca"]);
    useStore.getState().toggleTag("fim_de_semana");
    expect(useStore.getState().activeTags).toEqual([
      "noite_de_pipoca",
      "fim_de_semana",
    ]);
    useStore.getState().toggleTag("noite_de_pipoca");
    expect(useStore.getState().activeTags).toEqual(["fim_de_semana"]);
  });

  it("getCachedSeason returns null when not cached", () => {
    expect(useStore.getState().getCachedSeason(1, 1)).toBeNull();
  });

  it("setCachedSeason stores and retrieves season data", () => {
    const seasonData = {
      _id: "123",
      air_date: "2025-01-01",
      episodes: [],
      name: "Season 1",
      overview: "",
      id: 1,
      poster_path: null,
      season_number: 1,
    };
    useStore.getState().setCachedSeason(1, 1, seasonData);
    expect(useStore.getState().getCachedSeason(1, 1)).toEqual(seasonData);
    expect(useStore.getState().getCachedSeason(2, 1)).toBeNull();
  });
});
