import { logger } from "@/lib/logger";

import { listService } from "./listService";

type SharedTvItem = Awaited<ReturnType<typeof listService.getAllSharedTvItems>>;

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

export const sharedTvItemsSafeQuery = () => ({
  ...sharedTvItemsQuery(),
  queryFn: async (): Promise<SharedTvItem> => {
    try {
      return await listService.getAllSharedTvItems();
    } catch (err) {
      logger.error("Erro ao buscar séries de listas compartilhadas:", err);
      return [];
    }
  },
});

export const watchingContextBatchQuery = (
  items: Array<{ contentId: number; contentType: "movie" | "tv" }>,
) => ({
  queryKey: listServiceKeys.watchingContextBatch(items.map((i) => i.contentId)),
  queryFn: () => listService.getWatchingContextBatch(items),
  enabled: items.length > 0,
});
