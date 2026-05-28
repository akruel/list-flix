import type { Activity } from "@/types";

import { activityService } from "./activityService";

export const ACTIVITY_PAGE_SIZE = 50;

export const activityKeys = {
  all: ["activity"] as const,
  feed: () => [...activityKeys.all, "feed"] as const,
};

export const activityFeedQuery = () => ({
  queryKey: activityKeys.feed(),
  queryFn: ({ pageParam }: { pageParam: number }) =>
    activityService.getActivityFeed(ACTIVITY_PAGE_SIZE, pageParam),
  initialPageParam: 0,
  getNextPageParam: (
    lastPage: Activity[],
    _allPages: Activity[][],
    lastPageParam: number,
  ): number | undefined =>
    lastPage.length < ACTIVITY_PAGE_SIZE
      ? undefined
      : lastPageParam + lastPage.length,
});
