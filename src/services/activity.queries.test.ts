import { describe, expect, it, vi } from "vitest";

import type { Activity } from "@/types";

import {
  ACTIVITY_PAGE_SIZE,
  activityFeedQuery,
  activityKeys,
} from "./activity.queries";

vi.mock("./activityService", () => ({
  activityService: {
    getActivityFeed: vi.fn().mockResolvedValue([]),
  },
}));

function makePage(size: number): Activity[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `activity-${i}`,
    actor_id: "actor",
    activity_type: "episode_watched",
    list_id: "list",
    content_id: 1,
    content_type: "tv",
    metadata: {},
    created_at: "2026-05-22T10:00:00Z",
  }));
}

describe("activity.queries", () => {
  it("exposes a stable key hierarchy", () => {
    expect(activityKeys.all).toEqual(["activity"]);
    expect(activityKeys.feed()).toEqual(["activity", "feed"]);
  });

  it("delegates queryFn to activityService.getActivityFeed with page param as offset", async () => {
    const { activityService } = await import("./activityService");
    const query = activityFeedQuery();

    expect(query.queryKey).toEqual(["activity", "feed"]);
    expect(query.initialPageParam).toBe(0);

    await query.queryFn({ pageParam: 0 });
    expect(activityService.getActivityFeed).toHaveBeenCalledWith(
      ACTIVITY_PAGE_SIZE,
      0,
    );

    await query.queryFn({ pageParam: 50 });
    expect(activityService.getActivityFeed).toHaveBeenCalledWith(
      ACTIVITY_PAGE_SIZE,
      50,
    );
  });

  it("returns the next offset when a full page is received", () => {
    const query = activityFeedQuery();
    const fullPage = makePage(ACTIVITY_PAGE_SIZE);

    expect(query.getNextPageParam(fullPage, [fullPage], 0)).toBe(
      ACTIVITY_PAGE_SIZE,
    );
    expect(
      query.getNextPageParam(
        fullPage,
        [fullPage, fullPage],
        ACTIVITY_PAGE_SIZE,
      ),
    ).toBe(ACTIVITY_PAGE_SIZE * 2);
  });

  it("returns undefined when the last page is partial (signals end of feed)", () => {
    const query = activityFeedQuery();
    const partialPage = makePage(3);

    expect(
      query.getNextPageParam(partialPage, [partialPage], 0),
    ).toBeUndefined();
  });

  it("returns undefined for an empty last page", () => {
    const query = activityFeedQuery();
    expect(query.getNextPageParam([], [[]], 0)).toBeUndefined();
  });
});
