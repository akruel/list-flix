// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";

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

function setup(initial: UserContent | null = emptyUserContent()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  if (initial) {
    queryClient.setQueryData(userContentKeys.all, initial);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const getContent = () =>
    queryClient.getQueryData<UserContent>(userContentKeys.all);

  return { queryClient, Wrapper, getContent };
}

describe("watchlist mutation hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useToggleWatched marks and rolls back", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);
    mockedService.markAsUnwatched.mockResolvedValue(undefined);

    const { Wrapper, getContent } = setup();
    const { result } = renderHook(() => useToggleWatched(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ id: 1, mediaType: "movie", action: "watch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedIds).toEqual([1]);

    mockedService.markAsWatched.mockRejectedValue(new Error("fail"));
    result.current.mutate({ id: 2, mediaType: "tv", action: "watch" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getContent()?.watchedIds).toEqual([1]);

    result.current.mutate({ id: 1, mediaType: "movie", action: "unwatch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedIds).toEqual([]);
  });

  it("useToggleEpisodeWatched updates episodes optimistically", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);
    mockedService.markAsUnwatched.mockResolvedValue(undefined);

    const { Wrapper, getContent, queryClient } = setup();
    const { result } = renderHook(() => useToggleEpisodeWatched(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      showId: 10,
      episodeId: 100,
      seasonNumber: 1,
      episodeNumber: 2,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedEpisodes[10]?.[100]).toEqual({
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
    expect(getContent()?.watchedEpisodes[10]).toEqual({});

    queryClient.setQueryData<UserContent>(userContentKeys.all, {
      ...emptyUserContent(),
      watchedEpisodes: { 10: { 100: { season_number: 1, episode_number: 2 } } },
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
    expect(getContent()?.watchedEpisodes[10]?.[100]).toEqual({
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

    const { Wrapper, getContent } = setup();
    const { result } = renderHook(() => useToggleSeasonWatched(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      showId: 5,
      seasonNumber: 1,
      episodes,
      action: "watch",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedEpisodes[5]?.[201]).toBeDefined();

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

  it("seeds an empty cache and dedupes when no content is preloaded", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);

    const { Wrapper, getContent } = setup(null);
    const { result } = renderHook(() => useToggleWatched(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ id: 1, mediaType: "movie", action: "watch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedIds).toEqual([1]);

    result.current.mutate({ id: 1, mediaType: "movie", action: "watch" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.watchedIds).toEqual([1]);
  });

  it("seeds an empty cache for episode/season/metadata mutations", async () => {
    mockedService.markAsWatched.mockResolvedValue(undefined);
    mockedService.markSeasonAsWatched.mockResolvedValue(undefined);
    mockedService.saveSeriesMetadata.mockResolvedValue(undefined);

    const episode = setup(null);
    const { result: episodeResult } = renderHook(
      () => useToggleEpisodeWatched(),
      { wrapper: episode.Wrapper },
    );
    episodeResult.current.mutate({
      showId: 10,
      episodeId: 100,
      seasonNumber: 1,
      episodeNumber: 1,
      action: "watch",
    });
    await waitFor(() => expect(episodeResult.current.isSuccess).toBe(true));
    expect(episode.getContent()?.watchedEpisodes[10]?.[100]).toBeDefined();

    const season = setup(null);
    const { result: seasonResult } = renderHook(
      () => useToggleSeasonWatched(),
      { wrapper: season.Wrapper },
    );
    seasonResult.current.mutate({
      showId: 5,
      seasonNumber: 1,
      episodes: [{ id: 201, season_number: 1, episode_number: 1 }] as never,
      action: "watch",
    });
    await waitFor(() => expect(seasonResult.current.isSuccess).toBe(true));
    expect(season.getContent()?.watchedEpisodes[5]?.[201]).toBeDefined();

    const metadata = setup(null);
    const { result: metadataResult } = renderHook(
      () => useSaveSeriesMetadata(),
      { wrapper: metadata.Wrapper },
    );
    metadataResult.current.mutate({
      showId: 7,
      metadata: { total_episodes: 4, number_of_seasons: 1 },
    });
    await waitFor(() => expect(metadataResult.current.isSuccess).toBe(true));
    expect(metadata.getContent()?.seriesMetadata[7]).toBeDefined();
  });

  it("useSaveSeriesMetadata persists metadata optimistically", async () => {
    mockedService.saveSeriesMetadata.mockResolvedValue(undefined);

    const { Wrapper, getContent } = setup();
    const { result } = renderHook(() => useSaveSeriesMetadata(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      showId: 7,
      metadata: { total_episodes: 12, number_of_seasons: 2 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContent()?.seriesMetadata[7]).toEqual({
      total_episodes: 12,
      number_of_seasons: 2,
    });

    mockedService.saveSeriesMetadata.mockRejectedValue(new Error("fail"));
    result.current.mutate({
      showId: 8,
      metadata: { total_episodes: 1, number_of_seasons: 1 },
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getContent()?.seriesMetadata[8]).toBeUndefined();
  });
});
