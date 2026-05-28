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
import type { ContentItem } from "@/types";

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

  const getList = () =>
    queryClient.getQueryData<UserContent>(userContentKeys.all)?.watchlist;

  return { Wrapper, getList };
}

function withList(items: ContentItem[]): UserContent {
  return { ...emptyUserContent(), watchlist: items };
}

describe("useToggleWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically adds to watchlist and calls service", async () => {
    mockedService.addToWatchlist.mockResolvedValue(true);

    const { Wrapper, getList } = setup();
    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    const item = { id: 1, media_type: "movie" as const, title: "Movie" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getList()).toEqual([item]);
    expect(mockedService.addToWatchlist).toHaveBeenCalledWith(item);
  });

  it("rolls back watchlist on error", async () => {
    mockedService.addToWatchlist.mockRejectedValue(new Error("network"));

    const { Wrapper, getList } = setup();
    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    const item = { id: 2, media_type: "tv" as const, name: "Show" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(getList()).toEqual([]);
  });

  it("rolls back when add resolves with a soft failure", async () => {
    mockedService.addToWatchlist.mockResolvedValue(false);

    const { Wrapper, getList } = setup();
    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    const item = { id: 4, media_type: "movie" as const, title: "Movie" };
    result.current.mutate({ item, action: "add" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(getList()).toEqual([]);
  });

  it("optimistically removes from watchlist", async () => {
    mockedService.removeFromWatchlist.mockResolvedValue(true);

    const item = { id: 3, media_type: "movie" as const, title: "Old" };
    const { Wrapper, getList } = setup(withList([item]));
    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ item, action: "remove" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getList()).toEqual([]);
    expect(mockedService.removeFromWatchlist).toHaveBeenCalledWith(3);
  });

  it("seeds an empty cache and dedupes when no content is preloaded", async () => {
    mockedService.addToWatchlist.mockResolvedValue(true);

    const { Wrapper, getList } = setup(null);
    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    const item = { id: 9, media_type: "movie" as const, title: "Movie" };
    result.current.mutate({ item, action: "add" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getList()).toEqual([item]);

    result.current.mutate({ item, action: "add" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getList()).toEqual([item]);
  });

  it("rolls back when remove resolves with a soft failure", async () => {
    mockedService.removeFromWatchlist.mockResolvedValue(false);
    const item = { id: 5, media_type: "movie" as const, title: "Old" };
    const { Wrapper, getList } = setup(withList([item]));

    const { result } = renderHook(() => useToggleWatchlist(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ item, action: "remove" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(getList()).toEqual([item]);
  });
});
