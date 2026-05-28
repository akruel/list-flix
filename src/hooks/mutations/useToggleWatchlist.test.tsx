// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userContentService } from "@/services/userContent";
import { useUserContentStore } from "@/store/useUserContentStore";

import { useToggleWatchlist } from "./useToggleWatchlist";

vi.mock("@/services/userContent", () => ({
  userContentService: {
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
  },
}));

const mockedService = userContentService as unknown as {
  addToWatchlist: ReturnType<typeof vi.fn>;
  removeFromWatchlist: ReturnType<typeof vi.fn>;
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

describe("useToggleWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserContentStore.setState({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });
  });

  it("optimistically adds to watchlist and calls service", async () => {
    mockedService.addToWatchlist.mockResolvedValue(true);

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: createWrapper(),
    });

    const item = { id: 1, media_type: "movie" as const, title: "Movie" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(useUserContentStore.getState().myList).toEqual([item]);
    expect(mockedService.addToWatchlist).toHaveBeenCalledWith(item);
  });

  it("rolls back watchlist on error", async () => {
    mockedService.addToWatchlist.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: createWrapper(),
    });

    const item = { id: 2, media_type: "tv" as const, name: "Show" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useUserContentStore.getState().myList).toEqual([]);
  });

  it("rolls back when add resolves with a soft failure", async () => {
    mockedService.addToWatchlist.mockResolvedValue(false);

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: createWrapper(),
    });

    const item = { id: 4, media_type: "movie" as const, title: "Movie" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useUserContentStore.getState().myList).toEqual([]);
  });

  it("optimistically removes from watchlist", async () => {
    mockedService.removeFromWatchlist.mockResolvedValue(true);
    useUserContentStore.setState({
      myList: [{ id: 3, media_type: "movie", title: "Old" }],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      item: { id: 3, media_type: "movie", title: "Old" },
      action: "remove",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(useUserContentStore.getState().myList).toEqual([]);
    expect(mockedService.removeFromWatchlist).toHaveBeenCalledWith(3);
  });

  it("rolls back when remove resolves with a soft failure", async () => {
    mockedService.removeFromWatchlist.mockResolvedValue(false);
    const item = { id: 5, media_type: "movie" as const, title: "Old" };
    useUserContentStore.setState({
      myList: [item],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ item, action: "remove" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useUserContentStore.getState().myList).toEqual([item]);
  });
});
