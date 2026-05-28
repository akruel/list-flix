import { listService } from "./listService";

export const listServiceKeys = {
  all: ["listService"] as const,
  sharedTvItems: () => [...listServiceKeys.all, "sharedTvItems"] as const,
  watchingContextBatch: (itemIds: number[]) =>
    [
      ...listServiceKeys.all,
      "watchingContext",
      "batch",
      [...itemIds].sort((a, b) => a - b),
    ] as const,
};

export const sharedTvItemsQuery = () => ({
  queryKey: listServiceKeys.sharedTvItems(),
  queryFn: () => listService.getAllSharedTvItems(),
});

export const watchingContextBatchQuery = (
  items: Array<{ contentId: number; contentType: "movie" | "tv" }>,
) => ({
  queryKey: listServiceKeys.watchingContextBatch(items.map((i) => i.contentId)),
  queryFn: () => listService.getWatchingContextBatch(items),
  enabled: items.length > 0,
});
