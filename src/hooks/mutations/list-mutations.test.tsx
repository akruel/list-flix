// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";

import { useAddListItem } from "./useAddListItem";
import { useAddListItems } from "./useAddListItems";
import { useCreateList } from "./useCreateList";
import { useDeleteList } from "./useDeleteList";
import { useJoinList } from "./useJoinList";
import { useRemoveListItem } from "./useRemoveListItem";
import { useRemoveListMember } from "./useRemoveListMember";
import { useUpdateList } from "./useUpdateList";

vi.mock("@/services/listService", () => ({
  listService: {
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    addListItem: vi.fn(),
    addListItems: vi.fn(),
    removeListItem: vi.fn(),
    joinList: vi.fn(),
    removeListMember: vi.fn(),
  },
}));

const mockedService = listService as unknown as {
  createList: ReturnType<typeof vi.fn>;
  updateList: ReturnType<typeof vi.fn>;
  deleteList: ReturnType<typeof vi.fn>;
  addListItem: ReturnType<typeof vi.fn>;
  addListItems: ReturnType<typeof vi.fn>;
  removeListItem: ReturnType<typeof vi.fn>;
  joinList: ReturnType<typeof vi.fn>;
  removeListMember: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

const baseList = (overrides?: { id?: string; name?: string }) => ({
  id: overrides?.id ?? "list-1",
  name: overrides?.name ?? "List One",
  owner_id: "owner-1",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  role: "owner" as const,
});

describe("list mutation hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateList", () => {
    it("calls listService.createList and invalidates the lists key on settle", async () => {
      mockedService.createList.mockResolvedValue(baseList());
      const { queryClient, Wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateList(), {
        wrapper: Wrapper,
      });

      result.current.mutate("New List");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.createList).toHaveBeenCalledWith("New List");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: listsKeys.all });
    });
  });

  describe("useUpdateList", () => {
    it("performs optimistic update on lists and details when both are cached", async () => {
      mockedService.updateList.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();

      queryClient.setQueryData(listsKeys.all, [
        baseList(),
        baseList({ id: "list-2", name: "Other" }),
      ]);
      queryClient.setQueryData(listsKeys.detail("list-1"), {
        list: baseList(),
        items: [],
        members: [],
      });

      const { result } = renderHook(() => useUpdateList(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ id: "list-1", name: "Renamed" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const lists = queryClient.getQueryData<ReturnType<typeof baseList>[]>(
        listsKeys.all,
      );
      const detail = queryClient.getQueryData<{
        list: ReturnType<typeof baseList>;
      }>(listsKeys.detail("list-1"));

      expect(lists?.[0]?.name).toBe("Renamed");
      expect(lists?.[1]?.name).toBe("Other");
      expect(detail?.list.name).toBe("Renamed");
    });

    it("no-ops cache writes when neither lists nor details are cached", async () => {
      mockedService.updateList.mockResolvedValue(undefined);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useUpdateList(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ id: "list-1", name: "Renamed" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.updateList).toHaveBeenCalledWith(
        "list-1",
        "Renamed",
      );
    });

    it("rolls back lists and details cache on error", async () => {
      mockedService.updateList.mockRejectedValue(new Error("update failed"));
      const { queryClient, Wrapper } = createWrapper();

      const originalLists = [baseList()];
      const originalDetails = {
        list: baseList(),
        items: [],
        members: [],
      };
      queryClient.setQueryData(listsKeys.all, originalLists);
      queryClient.setQueryData(listsKeys.detail("list-1"), originalDetails);

      const { result } = renderHook(() => useUpdateList(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ id: "list-1", name: "Renamed" });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(
        queryClient.getQueryData<ReturnType<typeof baseList>[]>(listsKeys.all),
      ).toEqual(originalLists);
      expect(queryClient.getQueryData(listsKeys.detail("list-1"))).toEqual(
        originalDetails,
      );
    });
  });

  describe("useDeleteList", () => {
    it("optimistically removes the list and invalidates on settle", async () => {
      mockedService.deleteList.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();

      queryClient.setQueryData(listsKeys.all, [
        baseList(),
        baseList({ id: "list-2", name: "Other" }),
      ]);

      const { result } = renderHook(() => useDeleteList(), {
        wrapper: Wrapper,
      });

      result.current.mutate("list-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const lists = queryClient.getQueryData<ReturnType<typeof baseList>[]>(
        listsKeys.all,
      );
      expect(lists?.map((l) => l.id)).toEqual(["list-2"]);
    });

    it("rolls back lists cache when service throws", async () => {
      mockedService.deleteList.mockRejectedValue(new Error("delete failed"));
      const { queryClient, Wrapper } = createWrapper();

      const originalLists = [baseList()];
      queryClient.setQueryData(listsKeys.all, originalLists);

      const { result } = renderHook(() => useDeleteList(), {
        wrapper: Wrapper,
      });

      result.current.mutate("list-1");

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(queryClient.getQueryData(listsKeys.all)).toEqual(originalLists);
    });

    it("no-ops the cache update when lists are not cached", async () => {
      mockedService.deleteList.mockResolvedValue(undefined);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useDeleteList(), {
        wrapper: Wrapper,
      });

      result.current.mutate("list-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.deleteList).toHaveBeenCalledWith("list-1");
    });
  });

  describe("useAddListItem", () => {
    it("calls listService.addListItem and invalidates detail + containingContent keys", async () => {
      mockedService.addListItem.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useAddListItem(), {
        wrapper: Wrapper,
      });

      const item = { id: 99, media_type: "movie" as const, title: "Movie" };
      result.current.mutate({ listId: "list-1", item });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.addListItem).toHaveBeenCalledWith("list-1", item);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.detail("list-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.containingContent(99, "movie"),
      });
    });
  });

  describe("useAddListItems", () => {
    it("calls listService.addListItems and invalidates detail + all keys", async () => {
      mockedService.addListItems.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useAddListItems(), {
        wrapper: Wrapper,
      });

      const items = [
        { id: 1, media_type: "movie" as const, title: "A" },
        { id: 2, media_type: "tv" as const, name: "B" },
      ];
      result.current.mutate({ listId: "list-1", items });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.addListItems).toHaveBeenCalledWith("list-1", items);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.detail("list-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.all,
      });
    });
  });

  describe("useRemoveListItem", () => {
    it("calls listService.removeListItem and invalidates detail + containingContent", async () => {
      mockedService.removeListItem.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRemoveListItem(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        itemId: "item-1",
        listId: "list-1",
        contentId: 42,
        contentType: "movie",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.removeListItem).toHaveBeenCalledWith("item-1");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.detail("list-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.containingContent(42, "movie"),
      });
    });
  });

  describe("useJoinList", () => {
    it("joins with the provided role and invalidates affected keys", async () => {
      mockedService.joinList.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useJoinList(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        listId: "list-1",
        memberName: "Alice",
        role: "editor",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.joinList).toHaveBeenCalledWith(
        "list-1",
        "Alice",
        "editor",
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: listsKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: listsKeys.detail("list-1"),
      });
    });

    it("defaults the role to viewer when not provided", async () => {
      mockedService.joinList.mockResolvedValue(undefined);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useJoinList(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ listId: "list-1", memberName: "Bob" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedService.joinList).toHaveBeenCalledWith(
        "list-1",
        "Bob",
        "viewer",
      );
    });
  });

  describe("useRemoveListMember", () => {
    it("optimistically removes the member from the list-details cache", async () => {
      mockedService.removeListMember.mockResolvedValue(undefined);
      const { queryClient, Wrapper } = createWrapper();

      queryClient.setQueryData(listsKeys.detail("list-1"), {
        list: baseList(),
        items: [],
        members: [
          {
            list_id: "list-1",
            user_id: "owner-1",
            role: "owner",
            member_name: "Owner",
            created_at: "2026-01-01",
          },
          {
            list_id: "list-1",
            user_id: "viewer-1",
            role: "viewer",
            member_name: "Bob",
            created_at: "2026-01-01",
          },
        ],
      });

      const { result } = renderHook(() => useRemoveListMember(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ listId: "list-1", memberUserId: "viewer-1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const detail = queryClient.getQueryData<{
        members: Array<{ user_id: string }>;
      }>(listsKeys.detail("list-1"));
      expect(detail?.members.map((m) => m.user_id)).toEqual(["owner-1"]);
    });

    it("rolls back the details cache on error", async () => {
      mockedService.removeListMember.mockRejectedValue(
        new Error("remove failed"),
      );
      const { queryClient, Wrapper } = createWrapper();

      const original = {
        list: baseList(),
        items: [],
        members: [
          {
            list_id: "list-1",
            user_id: "viewer-1",
            role: "viewer" as const,
            member_name: "Bob",
            created_at: "2026-01-01",
          },
        ],
      };
      queryClient.setQueryData(listsKeys.detail("list-1"), original);

      const { result } = renderHook(() => useRemoveListMember(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ listId: "list-1", memberUserId: "viewer-1" });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(queryClient.getQueryData(listsKeys.detail("list-1"))).toEqual(
        original,
      );
    });

    it("no-ops the cache update when details are not cached", async () => {
      mockedService.removeListMember.mockResolvedValue(undefined);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useRemoveListMember(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ listId: "list-1", memberUserId: "viewer-1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedService.removeListMember).toHaveBeenCalledWith(
        "list-1",
        "viewer-1",
      );
    });
  });
});
