// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "@/services/userContent";
import {
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";

import {
  useIsInList,
  useIsWatched,
  useMyList,
  useSeriesMetadata,
  useShowWatchedEpisodes,
  useWatchedEpisodes,
  useWatchedIds,
} from "./userContent";

vi.mock("@/services/userContent", () => ({
  userContentService: { getUserContent: vi.fn() },
}));

const mockedService = userContentService as unknown as {
  getUserContent: ReturnType<typeof vi.fn>;
};

const sample: UserContent = {
  watchlist: [
    { id: 1, media_type: "movie", title: "Movie" },
    { id: 2, media_type: "tv", name: "Show" },
  ],
  watchedIds: [1, 5],
  watchedEpisodes: {
    10: { 100: { season_number: 1, episode_number: 1 } },
  },
  seriesMetadata: { 10: { total_episodes: 12, number_of_seasons: 2 } },
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** Seeded client: hooks read synchronously from the cache, no fetch. */
function seeded(seed: UserContent = sample) {
  const queryClient = makeClient();
  queryClient.setQueryData(userContentKeys.all, seed);
  return wrapperFor(queryClient);
}

/** Pending client: query never resolves, so hooks return their fallbacks. */
function pending() {
  mockedService.getUserContent.mockReturnValue(new Promise<never>(() => {}));
  return wrapperFor(makeClient());
}

describe("userContent read hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.getUserContent.mockResolvedValue(sample);
  });

  it("useMyList returns the watchlist, and [] while loading", () => {
    const { result: loading } = renderHook(() => useMyList(), {
      wrapper: pending(),
    });
    expect(loading.current).toEqual([]);

    const { result: ready } = renderHook(() => useMyList(), {
      wrapper: seeded(),
    });
    expect(ready.current).toEqual(sample.watchlist);
  });

  it("useWatchedIds returns watched ids, and [] while loading", () => {
    const { result: loading } = renderHook(() => useWatchedIds(), {
      wrapper: pending(),
    });
    expect(loading.current).toEqual([]);

    const { result: ready } = renderHook(() => useWatchedIds(), {
      wrapper: seeded(),
    });
    expect(ready.current).toEqual(sample.watchedIds);
  });

  it.each([
    { id: 1, expected: true },
    { id: 999, expected: false },
  ])("useIsInList($id) is $expected once loaded", ({ id, expected }) => {
    const { result } = renderHook(() => useIsInList(id), { wrapper: seeded() });
    expect(result.current).toBe(expected);
  });

  it("useIsInList returns false while loading", () => {
    const { result } = renderHook(() => useIsInList(1), { wrapper: pending() });
    expect(result.current).toBe(false);
  });

  it.each([
    { id: 5, expected: true },
    { id: 999, expected: false },
  ])("useIsWatched($id) is $expected once loaded", ({ id, expected }) => {
    const { result } = renderHook(() => useIsWatched(id), {
      wrapper: seeded(),
    });
    expect(result.current).toBe(expected);
  });

  it("useIsWatched returns false while loading", () => {
    const { result } = renderHook(() => useIsWatched(5), {
      wrapper: pending(),
    });
    expect(result.current).toBe(false);
  });

  it("useWatchedEpisodes returns the full map, and {} while loading", () => {
    const { result: loading } = renderHook(() => useWatchedEpisodes(), {
      wrapper: pending(),
    });
    expect(loading.current).toEqual({});

    const { result: ready } = renderHook(() => useWatchedEpisodes(), {
      wrapper: seeded(),
    });
    expect(ready.current).toEqual(sample.watchedEpisodes);
  });

  it("useShowWatchedEpisodes returns the show map or {} when absent/loading", () => {
    const { result: present } = renderHook(() => useShowWatchedEpisodes(10), {
      wrapper: seeded(),
    });
    expect(present.current).toEqual(sample.watchedEpisodes[10]);

    const { result: absent } = renderHook(() => useShowWatchedEpisodes(999), {
      wrapper: seeded(),
    });
    expect(absent.current).toEqual({});

    const { result: loading } = renderHook(() => useShowWatchedEpisodes(10), {
      wrapper: pending(),
    });
    expect(loading.current).toEqual({});
  });

  it("useSeriesMetadata returns the entry or undefined when absent/loading", () => {
    const { result: present } = renderHook(() => useSeriesMetadata(10), {
      wrapper: seeded(),
    });
    expect(present.current).toEqual(sample.seriesMetadata[10]);

    const { result: absent } = renderHook(() => useSeriesMetadata(999), {
      wrapper: seeded(),
    });
    expect(absent.current).toBeUndefined();

    const { result: loading } = renderHook(() => useSeriesMetadata(10), {
      wrapper: pending(),
    });
    expect(loading.current).toBeUndefined();
  });

  it("refetches and reflects server data through select", async () => {
    const queryClient = makeClient();
    const { result } = renderHook(() => useMyList(), {
      wrapper: wrapperFor(queryClient),
    });

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual(sample.watchlist));
    expect(mockedService.getUserContent).toHaveBeenCalledOnce();
  });
});
