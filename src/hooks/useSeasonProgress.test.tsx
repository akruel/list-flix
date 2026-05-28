import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSeasonProgress } from "./useSeasonProgress";

const mocks = vi.hoisted(() => ({
  watchedEpisodes: {} as Record<
    number,
    Record<number, { season_number: number; episode_number: number }>
  >,
}));

vi.mock("../store/useUserContentStore", () => ({
  useUserContentStore: (
    selector: (state: {
      watchedEpisodes: typeof mocks.watchedEpisodes;
    }) => unknown,
  ) => selector({ watchedEpisodes: mocks.watchedEpisodes }),
}));

function setWatchedSeasonEpisodes(
  showId: number,
  seasonNumber: number,
  count: number,
) {
  const map: Record<number, { season_number: number; episode_number: number }> =
    {};
  for (let i = 1; i <= count; i++) {
    map[i] = { season_number: seasonNumber, episode_number: i };
  }
  mocks.watchedEpisodes = { [showId]: map };
}

describe("useSeasonProgress", () => {
  beforeEach(() => {
    mocks.watchedEpisodes = {};
  });

  it.each([
    {
      caseName: "normal percentage",
      watchedCount: 4,
      totalEpisodes: 10,
      expectedPercentage: 40,
    },
    {
      caseName: "rounded percentage",
      watchedCount: 1,
      totalEpisodes: 3,
      expectedPercentage: 33,
    },
    {
      caseName: "zero total episodes",
      watchedCount: 4,
      totalEpisodes: 0,
      expectedPercentage: 0,
    },
  ])(
    "returns progress for $caseName",
    ({ watchedCount, totalEpisodes, expectedPercentage }) => {
      setWatchedSeasonEpisodes(100, 2, watchedCount);

      const { result } = renderHook(() =>
        useSeasonProgress(100, 2, totalEpisodes),
      );

      expect(result.current).toEqual({
        watchedCount,
        totalCount: totalEpisodes,
        percentage: expectedPercentage,
      });
    },
  );

  it("ignores episodes from other seasons", () => {
    mocks.watchedEpisodes = {
      100: {
        1: { season_number: 1, episode_number: 1 },
        2: { season_number: 2, episode_number: 1 },
        3: { season_number: 2, episode_number: 2 },
      },
    };

    const { result } = renderHook(() => useSeasonProgress(100, 2, 5));

    expect(result.current).toEqual({
      watchedCount: 2,
      totalCount: 5,
      percentage: 40,
    });
  });

  it("returns zero progress when the show has no watched episodes recorded", () => {
    mocks.watchedEpisodes = {
      100: { 1: { season_number: 1, episode_number: 1 } },
    };

    const { result } = renderHook(() => useSeasonProgress(999, 1, 5));

    expect(result.current).toEqual({
      watchedCount: 0,
      totalCount: 5,
      percentage: 0,
    });
  });
});
