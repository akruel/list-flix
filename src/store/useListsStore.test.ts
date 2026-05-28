// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { listService } from "../services/listService";
import { useListsStore } from "./useListsStore";

vi.mock("../services/listService", () => ({
  listService: {
    getLists: vi.fn(),
    createList: vi.fn(),
    deleteList: vi.fn(),
    updateList: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedListService = listService as unknown as {
  getLists: MockFn;
  createList: MockFn;
  deleteList: MockFn;
  updateList: MockFn;
};

describe("useListsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useListsStore.setState({ lists: [] });
  });

  it("fetchLists loads lists from service", async () => {
    mockedListService.getLists.mockResolvedValue([
      {
        id: "list-1",
        name: "Fetched",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
    ]);

    await useListsStore.getState().fetchLists();

    expect(useListsStore.getState().lists).toHaveLength(1);
  });

  it("createList returns created list and triggers fetchLists", async () => {
    mockedListService.createList.mockResolvedValue({
      id: "list-1",
      name: "New",
      owner_id: "owner-1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      role: "owner",
    });
    mockedListService.getLists.mockResolvedValue([]);

    const created = await useListsStore.getState().createList("New");

    expect(created.name).toBe("New");
    expect(mockedListService.createList).toHaveBeenCalledWith("New");
    expect(mockedListService.getLists).toHaveBeenCalled();
  });

  it("removes list from state after deleteList", async () => {
    mockedListService.deleteList.mockResolvedValue(undefined);

    useListsStore.setState({
      lists: [
        {
          id: "list-1",
          name: "List 1",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role: "owner",
        },
        {
          id: "list-2",
          name: "List 2",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role: "owner",
        },
      ],
    });

    await useListsStore.getState().deleteList("list-1");

    expect(mockedListService.deleteList).toHaveBeenCalledWith("list-1");
    expect(useListsStore.getState().lists).toEqual([
      {
        id: "list-2",
        name: "List 2",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
    ]);
  });

  it.each([
    { caseName: "owner list", role: "owner" as const },
    { caseName: "editor list", role: "editor" as const },
    { caseName: "viewer list", role: "viewer" as const },
  ])("updates list name in state for $caseName", async ({ role }) => {
    mockedListService.updateList.mockResolvedValue(undefined);

    useListsStore.setState({
      lists: [
        {
          id: "list-1",
          name: "Old Name",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role,
        },
      ],
    });

    await useListsStore.getState().updateList("list-1", "New Name");

    expect(mockedListService.updateList).toHaveBeenCalledWith(
      "list-1",
      "New Name",
    );
    expect(useListsStore.getState().lists[0]?.name).toBe("New Name");
  });

  it("updateList keeps non-targeted lists unchanged", async () => {
    mockedListService.updateList.mockResolvedValue(undefined);

    useListsStore.setState({
      lists: [
        {
          id: "list-1",
          name: "Old Name",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role: "owner",
        },
        {
          id: "list-2",
          name: "Keep Me",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role: "viewer",
        },
      ],
    });

    await useListsStore.getState().updateList("list-1", "New Name");

    expect(useListsStore.getState().lists).toEqual([
      expect.objectContaining({ id: "list-1", name: "New Name" }),
      expect.objectContaining({ id: "list-2", name: "Keep Me" }),
    ]);
  });
});
