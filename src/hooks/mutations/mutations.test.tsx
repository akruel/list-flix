// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "@/services/userContent";
import { useUserContentStore } from "@/store/useUserContentStore";

import {
  useSaveSeriesMetadata,
  useToggleEpisodeWatched,
  useToggleSeasonWatched,
  useToggleWatched,
} from "./index";

vi.mock("@/services/userContent", () => ({
  userContentService: {
    markAsWatched: vi.fn(),
    markAsUnwatched: vi.fn(),
    markSeasonAsWatched: vi.fn(),
    markSeasonAsUnwatched: vi.fn(),
    saveSeriesMetadata: vi.fn(),
  },
}));

vi.mock("@/services/listService", () => ({
  listService: {},
}));

const mockedService = userContentService as unknown as {
  markAsWatched: ReturnType<typeof vi.fn>;
  markAsUnwatched: ReturnType<typeof vi.fn>;
  markSeasonAsWatched: ReturnType<typeof vi.fn>;
  markSeasonAsUnwatched: ReturnType<typeof vi.fn>;
  saveSeriesMetadata: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return Wrapper;
}

describe("watchlist mutation hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserContentStore.setState({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });
  });

  it("useToggleWatched marks and rolls back", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);
    mockedService.markAsUnwatched.mockResolvedValue(undefined);

    const { result } = renderHook(() => useToggleWatched(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, mediaType: "movie", action: "watch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserContentStore.getState().watchedIds).toEqual([1]);

    mockedService.markAsWatched.mockRejectedValue(new Error("fail"));
    result.current.mutate({ id: 2, mediaType: "tv", action: "watch" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useUserContentStore.getState().watchedIds).toEqual([1]);

    result.current.mutate({ id: 1, mediaType: "movie", action: "unwatch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserContentStore.getState().watchedIds).toEqual([]);
  });

  it("useToggleEpisodeWatched updates episodes optimistically", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);
    mockedService.markAsUnwatched.mockResolvedValue(undefined);

    const { result } = renderHook(() => useToggleEpisodeWatched(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      showId: 10,
      episodeId: 100,
      seasonNumber: 1,
      episodeNumber: 2,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserContentStore.getState().watchedEpisodes[10]?.[100]).toEqual({
      season_number: 1,
      episode_number: 2,
    });

    result.current.mutate({
      showId: 10,
      episodeId: 100,
      seasonNumber: 1,
      episodeNumber: 2,
      action: "unwatch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserContentStore.getState().watchedEpisodes[10]).toEqual({});

    useUserContentStore.setState({
      watchedEpisodes: { 10: { 100: { season_number: 1, episode_number: 2 } } },
      myList: [],
      watchedIds: [],
      seriesMetadata: {},
    });
    mockedService.markAsWatched.mockRejectedValue(new Error("fail"));
    result.current.mutate({
      showId: 10,
      episodeId: 100,
      seasonNumber: 1,
      episodeNumber: 2,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useUserContentStore.getState().watchedEpisodes[10]?.[100]).toEqual({
      season_number: 1,
      episode_number: 2,
    });
  });

  it("useToggleSeasonWatched marks season and rolls back on error", async () => {
    mockedService.markSeasonAsWatched.mockResolvedValue(undefined);
    mockedService.markSeasonAsUnwatched.mockResolvedValue(undefined);

    const episodes = [
      { id: 201, season_number: 1, episode_number: 1 },
    ] as never;

    const { result } = renderHook(() => useToggleSeasonWatched(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      showId: 5,
      seasonNumber: 1,
      episodes,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      useUserContentStore.getState().watchedEpisodes[5]?.[201],
    ).toBeDefined();

    mockedService.markSeasonAsWatched.mockRejectedValue(new Error("fail"));
    result.current.mutate({
      showId: 5,
      seasonNumber: 2,
      episodes,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    result.current.mutate({
      showId: 5,
      seasonNumber: 1,
      episodes: [],
      action: "unwatch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useSaveSeriesMetadata persists metadata optimistically", async () => {
    mockedService.saveSeriesMetadata.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSaveSeriesMetadata(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      showId: 7,
      metadata: { total_episodes: 12, number_of_seasons: 2 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserContentStore.getState().seriesMetadata[7]).toEqual({
      total_episodes: 12,
      number_of_seasons: 2,
    });

    mockedService.saveSeriesMetadata.mockRejectedValue(new Error("fail"));
    result.current.mutate({
      showId: 8,
      metadata: { total_episodes: 1, number_of_seasons: 1 },
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useUserContentStore.getState().seriesMetadata[8]).toBeUndefined();
  });
});
