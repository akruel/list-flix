import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSeriesProgress } from "./useSeriesProgress";

const mocks = vi.hoisted(() => ({
  watchedEpisodes: {} as Record<
    number,
    Record<number, { season_number: number; episode_number: number }>
  >,
}));

vi.mock("./userContent", () => ({
  useShowWatchedEpisodes: (showId: number) =>
    mocks.watchedEpisodes[showId] ?? {},
}));

function setWatchedSeriesEpisodes(showId: number, count: number) {
  const map: Record<number, { season_number: number; episode_number: number }> =
    {};
  for (let i = 1; i <= count; i++) {
    map[i] = { season_number: 1, episode_number: i };
  }
  mocks.watchedEpisodes = { [showId]: map };
}

describe("useSeriesProgress", () => {
  beforeEach(() => {
    mocks.watchedEpisodes = {};
  });

  it.each([
    {
      caseName: "normal percentage",
      watchedCount: 8,
      totalEpisodes: 16,
      expectedPercentage: 50,
    },
    {
      caseName: "rounded percentage",
      watchedCount: 2,
      totalEpisodes: 3,
      expectedPercentage: 67,
    },
    {
      caseName: "zero total episodes",
      watchedCount: 2,
      totalEpisodes: 0,
      expectedPercentage: 0,
    },
  ])(
    "returns progress for $caseName",
    ({ watchedCount, totalEpisodes, expectedPercentage }) => {
      setWatchedSeriesEpisodes(200, watchedCount);

      const { result } = renderHook(() =>
        useSeriesProgress(200, totalEpisodes),
      );

      expect(result.current).toEqual({
        watchedCount,
        totalCount: totalEpisodes,
        percentage: expectedPercentage,
      });
    },
  );

  it("ignores specials (season 0)", () => {
    mocks.watchedEpisodes = {
      200: {
        1: { season_number: 0, episode_number: 1 },
        2: { season_number: 1, episode_number: 1 },
        3: { season_number: 1, episode_number: 2 },
      },
    };

    const { result } = renderHook(() => useSeriesProgress(200, 5));

    expect(result.current).toEqual({
      watchedCount: 2,
      totalCount: 5,
      percentage: 40,
    });
  });

  it("returns zero progress when the show has no watched episodes recorded", () => {
    mocks.watchedEpisodes = {
      200: { 1: { season_number: 1, episode_number: 1 } },
    };

    const { result } = renderHook(() => useSeriesProgress(999, 10));

    expect(result.current).toEqual({
      watchedCount: 0,
      totalCount: 10,
      percentage: 0,
    });
  });
});
