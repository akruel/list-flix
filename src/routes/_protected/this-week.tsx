import { createFileRoute } from "@tanstack/react-router";

import { sharedTvItemsSafeQuery } from "@/services/listService.queries";

import {
  ThisWeekComponent,
  ThisWeekErrorComponent,
  ThisWeekSkeleton,
} from "./-this-week";

// The route-level errorComponent is a safety net for unexpected loader failures
// only. The tolerant sharedTvItemsSafeQuery means it should almost never
// trigger. Per-query TMDB errors are handled inline via isError / partial
// failure banner.
export const Route = createFileRoute("/_protected/this-week")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sharedTvItemsSafeQuery()),
  pendingComponent: ThisWeekSkeleton,
  errorComponent: ThisWeekErrorComponent,
  component: ThisWeekComponent,
});
