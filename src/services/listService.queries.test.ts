import { describe, expect, it, vi } from "vitest";

import {
  listServiceKeys,
  sharedTvItemsQuery,
  watchingContextBatchQuery,
} from "./listService.queries";

vi.mock("./listService", () => ({
  listService: {
    getAllSharedTvItems: vi.fn().mockResolvedValue([]),
    getWatchingContextBatch: vi.fn().mockResolvedValue({}),
  },
}));

describe("listService.queries", () => {
  it("builds a stable key hierarchy", () => {
    expect(listServiceKeys.all).toEqual(["listService"]);
    expect(listServiceKeys.sharedTvItems()).toEqual([
      "listService",
      "sharedTvItems",
    ]);
  });

  it("watchingContextBatch key sorts ids for cache stability", () => {
    expect(listServiceKeys.watchingContextBatch([3, 1, 2])).toEqual([
      "listService",
      "watchingContext",
      "batch",
      [1, 2, 3],
    ]);
  });

  it("sharedTvItemsQuery delegates to listService.getAllSharedTvItems", async () => {
    const { listService } = await import("./listService");
    const query = sharedTvItemsQuery();

    expect(query.queryKey).toEqual(["listService", "sharedTvItems"]);
    await query.queryFn();
    expect(listService.getAllSharedTvItems).toHaveBeenCalledOnce();
  });

  it("watchingContextBatchQuery passes items and gates with enabled", async () => {
    const { listService } = await import("./listService");

    const items = [
      { contentId: 5, contentType: "tv" as const },
      { contentId: 2, contentType: "movie" as const },
    ];
    const query = watchingContextBatchQuery(items);

    expect(query.queryKey).toEqual([
      "listService",
      "watchingContext",
      "batch",
      [2, 5],
    ]);
    expect(query.enabled).toBe(true);

    await query.queryFn();
    expect(listService.getWatchingContextBatch).toHaveBeenCalledWith(items);
  });

  it("watchingContextBatchQuery is disabled when no items are provided", () => {
    const query = watchingContextBatchQuery([]);
    expect(query.enabled).toBe(false);
  });
});
