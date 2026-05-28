import { describe, expect, it, vi } from "vitest";

import {
  listDetailsQuery,
  listNameQuery,
  listsContainingContentQuery,
  listsKeys,
  listsQuery,
} from "./list.queries";

vi.mock("./listService", () => ({
  listService: {
    getLists: vi.fn().mockResolvedValue([]),
    getListDetails: vi.fn().mockResolvedValue(null),
    getListsContainingContent: vi.fn().mockResolvedValue({}),
    getListName: vi.fn().mockResolvedValue("Some list"),
  },
}));

describe("list.queries", () => {
  it("builds a stable key hierarchy", () => {
    expect(listsKeys.all).toEqual(["lists"]);
    expect(listsKeys.detail("list-1")).toEqual(["lists", "detail", "list-1"]);
    expect(listsKeys.containingContent(42, "movie")).toEqual([
      "lists",
      "containingContent",
      "movie",
      42,
    ]);
    expect(listsKeys.name("list-1")).toEqual(["lists", "name", "list-1"]);
  });

  it("listsQuery delegates to listService.getLists", async () => {
    const { listService } = await import("./listService");
    const query = listsQuery();

    expect(query.queryKey).toEqual(["lists"]);
    await query.queryFn();
    expect(listService.getLists).toHaveBeenCalledOnce();
  });

  it("listDetailsQuery delegates to listService.getListDetails and gates with enabled", async () => {
    const { listService } = await import("./listService");
    const query = listDetailsQuery("list-1");

    expect(query.queryKey).toEqual(["lists", "detail", "list-1"]);
    expect(query.enabled).toBe(true);
    await query.queryFn();
    expect(listService.getListDetails).toHaveBeenCalledWith("list-1");
  });

  it("listDetailsQuery is disabled when id is empty", () => {
    const query = listDetailsQuery("");
    expect(query.enabled).toBe(false);
  });

  it("listsContainingContentQuery delegates to listService.getListsContainingContent", async () => {
    const { listService } = await import("./listService");
    const query = listsContainingContentQuery(42, "movie");

    expect(query.queryKey).toEqual(["lists", "containingContent", "movie", 42]);
    await query.queryFn();
    expect(listService.getListsContainingContent).toHaveBeenCalledWith(
      42,
      "movie",
    );
  });

  it("listNameQuery delegates to listService.getListName and gates with enabled", async () => {
    const { listService } = await import("./listService");
    const query = listNameQuery("list-1");

    expect(query.queryKey).toEqual(["lists", "name", "list-1"]);
    expect(query.enabled).toBe(true);
    await query.queryFn();
    expect(listService.getListName).toHaveBeenCalledWith("list-1");
  });

  it("listNameQuery is disabled when id is empty", () => {
    const query = listNameQuery("");
    expect(query.enabled).toBe(false);
  });
});
