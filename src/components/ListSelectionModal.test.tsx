import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListSelectionModal } from "./ListSelectionModal";

const mocks = vi.hoisted(() => ({
  lists: [] as Array<{
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
    role: "owner" | "editor" | "viewer";
  }>,
  myList: [] as Array<{ id: number; media_type: "movie" | "tv" }>,
  toggleWatchlist: vi.fn(),
  addListItem: vi.fn(),
  removeListItem: vi.fn(),
  getLists: vi.fn(),
  getListsContainingContent: vi.fn(),
}));

vi.mock("@/hooks/mutations", () => ({
  useToggleWatchlist: () => ({ mutate: mocks.toggleWatchlist }),
  useAddListItem: () => ({ mutateAsync: mocks.addListItem }),
  useRemoveListItem: () => ({ mutateAsync: mocks.removeListItem }),
}));

vi.mock("@/hooks/userContent", () => ({
  useIsInList: (id: number) => mocks.myList.some((item) => item.id === id),
}));

vi.mock("../services/listService", () => ({
  listService: {
    getLists: (...args: unknown[]) => mocks.getLists(...args),
    getListsContainingContent: (...args: unknown[]) =>
      mocks.getListsContainingContent(...args),
  },
}));

vi.mock("./skeletons", () => ({
  ListSelectionModalSkeleton: () => (
    <div data-testid="list-selection-skeleton" />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(true)}>
        dialog-open
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        dialog-close
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderModal(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ListSelectionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lists = [];
    mocks.myList = [];
    mocks.getLists.mockImplementation(() => Promise.resolve(mocks.lists));
    mocks.getListsContainingContent.mockResolvedValue({});
    mocks.removeListItem.mockResolvedValue(undefined);
    mocks.addListItem.mockResolvedValue(undefined);
  });

  const content = {
    id: 10,
    media_type: "movie" as const,
    title: "Movie",
  };

  it("loads lists and membership when opened", async () => {
    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(mocks.getLists).toHaveBeenCalled();
    });
    expect(mocks.getListsContainingContent).toHaveBeenCalledWith(10, "movie");
  });

  it("shows custom empty state when no custom lists exist", async () => {
    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    expect(
      await screen.findByText("Nenhuma lista personalizada encontrada."),
    ).toBeInTheDocument();
  });

  it.each([
    {
      caseName: "remove from default list",
      inList: true,
      expectedCall: "remove",
    },
    {
      caseName: "add to default list",
      inList: false,
      expectedCall: "add",
    },
  ])("toggles default list for $caseName", async ({ inList, expectedCall }) => {
    mocks.myList = inList
      ? [{ id: content.id, media_type: content.media_type }]
      : [];

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await screen.findByText("Minha Lista");
    await userEvent.click(screen.getByRole("button", { name: /Minha Lista/i }));

    expect(mocks.toggleWatchlist).toHaveBeenCalledWith({
      item: content,
      action: expectedCall,
    });
  });

  it("toggles custom list removal when membership exists", async () => {
    mocks.lists = [
      {
        id: "list-1",
        name: "Owner list",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
      {
        id: "list-2",
        name: "Viewer list",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "viewer",
      },
    ];
    mocks.getListsContainingContent.mockResolvedValue({
      "list-1": "item-1",
    });

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Owner list")).toBeInTheDocument();
    });
    expect(screen.queryByText("Viewer list")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Owner list/i }));

    await waitFor(() => {
      expect(mocks.removeListItem).toHaveBeenCalledWith({
        itemId: "item-1",
        listId: "list-1",
        contentId: content.id,
        contentType: content.media_type,
      });
    });
  });

  it("toggles custom list add when membership does not exist", async () => {
    mocks.lists = [
      {
        id: "list-1",
        name: "Editor list",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "editor",
      },
    ];
    mocks.getListsContainingContent.mockResolvedValueOnce({});

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Editor list")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Editor list/i }));

    await waitFor(() => {
      expect(mocks.addListItem).toHaveBeenCalledWith({
        listId: "list-1",
        item: content,
      });
    });
  });

  it("handles loading errors without crashing", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getLists.mockRejectedValue(new Error("load failed"));

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("logs membership query errors without crashing", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getListsContainingContent.mockRejectedValue(
      new Error("membership failed"),
    );

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        "Error loading membership:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles toggle errors without crashing", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.lists = [
      {
        id: "list-1",
        name: "Owner list",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
    ];
    mocks.getListsContainingContent.mockResolvedValue({
      "list-1": "item-1",
    });
    mocks.removeListItem.mockRejectedValue(new Error("toggle failed"));

    renderModal(
      <ListSelectionModal isOpen onClose={vi.fn()} content={content} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Owner list")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Owner list/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("closes modal when concluído button is clicked", async () => {
    const onClose = vi.fn();
    renderModal(
      <ListSelectionModal isOpen onClose={onClose} content={content} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Concluído" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    {
      caseName: "onOpenChange(false)",
      trigger: "dialog-close",
      expectedCalls: 1,
    },
    {
      caseName: "onOpenChange(true)",
      trigger: "dialog-open",
      expectedCalls: 0,
    },
  ])(
    "handles dialog close behavior for $caseName",
    async ({ trigger, expectedCalls }) => {
      const onClose = vi.fn();
      renderModal(
        <ListSelectionModal isOpen onClose={onClose} content={content} />,
      );

      await userEvent.click(screen.getByRole("button", { name: trigger }));

      expect(onClose).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});
