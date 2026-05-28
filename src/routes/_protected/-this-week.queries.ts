import { logger } from "@/lib/logger";
import { listService } from "@/services/listService";
import { sharedTvItemsQuery } from "@/services/listService.queries";

type SharedTvItem = Awaited<ReturnType<typeof listService.getAllSharedTvItems>>;

// Route-local wrapper around sharedTvItemsQuery. Shares the queryKey with the
// strict version so the cache is unified, but swallows fetch errors so a
// shared-list outage cannot blow up the whole route. Personal watchlist
// content keeps rendering when shared fetch fails.
// NOTE: Phase D is the sole consumer of sharedTvItemsQuery today. If another
// consumer ever needs strict error propagation, give it a distinct queryKey.
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
