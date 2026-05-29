import { describe, expect, it, vi } from "vitest";

import {
  listServiceKeys,
  sharedTvItemsQuery,
  sharedTvItemsSafeQuery,
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

  it("sharedTvItemsSafeQuery returns shared items when service succeeds", async () => {
    const { listService } = await import("./listService");
    const items = [{ content_id: 10, content_type: "tv" }];
    vi.mocked(listService.getAllSharedTvItems).mockResolvedValueOnce(
      items as Awaited<ReturnType<typeof listService.getAllSharedTvItems>>,
    );

    const query = sharedTvItemsSafeQuery();

    expect(query.queryKey).toEqual(["listService", "sharedTvItems"]);
    await expect(query.queryFn()).resolves.toEqual(items);
  });

  it("sharedTvItemsSafeQuery returns an empty list when service fails", async () => {
    const { listService } = await import("./listService");
    vi.mocked(listService.getAllSharedTvItems).mockRejectedValueOnce(
      new Error("failed"),
    );

    const query = sharedTvItemsSafeQuery();

    await expect(query.queryFn()).resolves.toEqual([]);
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
