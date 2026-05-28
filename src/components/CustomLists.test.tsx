import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomLists } from "./CustomLists";

const mocks = vi.hoisted(() => ({
  lists: [] as Array<{
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
    role: "owner" | "editor" | "viewer";
  }>,
  getLists: vi.fn(),
  createList: vi.fn(),
  deleteList: vi.fn(),
  addListItems: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/mutations", () => ({
  useCreateList: () => ({ mutateAsync: mocks.createList }),
  useDeleteList: () => ({ mutateAsync: mocks.deleteList }),
  useAddListItems: () => ({ mutateAsync: mocks.addListItems }),
}));

vi.mock("../services/listService", () => ({
  listService: {
    getLists: (...args: unknown[]) => mocks.getLists(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href="https://test.com" data-to={to}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("./DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({
    onConfirm,
    onClose,
  }: {
    onConfirm: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button type="button" onClick={onConfirm}>
        confirm-delete
      </button>
      <button type="button" onClick={onClose}>
        close-delete
      </button>
    </div>
  ),
}));

vi.mock("./MagicSearchModal", () => ({
  MagicSearchModal: ({
    isOpen,
    onSaveList,
    onClose,
  }: {
    isOpen: boolean;
    onSaveList: (
      name: string,
      items: Array<{ id: number; media_type: "movie" | "tv" }>,
    ) => Promise<void>;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <button
          type="button"
          onClick={() =>
            void onSaveList("Magic List", [
              { id: 10, media_type: "movie" },
              { id: 20, media_type: "tv" },
            ]).catch(() => {})
          }
        >
          save-magic
        </button>
        <button type="button" onClick={onClose}>
          close-magic
        </button>
      </div>
    ) : null,
}));

function renderCustomLists() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CustomLists />
    </QueryClientProvider>,
  );
}

describe("CustomLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lists = [];
    mocks.getLists.mockImplementation(() => Promise.resolve(mocks.lists));
    mocks.createList.mockResolvedValue({
      id: "list-1",
      name: "Created",
      owner_id: "owner-1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      role: "owner",
    });
    mocks.deleteList.mockResolvedValue(undefined);
    mocks.addListItems.mockResolvedValue(undefined);
  });

  it("loads lists on mount and shows empty state", async () => {
    renderCustomLists();

    await waitFor(() => {
      expect(mocks.getLists).toHaveBeenCalled();
    });
    expect(
      screen.getByText("Você ainda não criou nenhuma lista personalizada."),
    ).toBeInTheDocument();
  });

  it("creates manual list", async () => {
    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Manual/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Nome da Lista"),
      "Minha Lista",
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(mocks.createList).toHaveBeenCalledWith("Minha Lista");
    });
  });

  it("shows error toast when manual list creation fails", async () => {
    mocks.createList.mockRejectedValueOnce(new Error("create failed"));

    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Manual/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Nome da Lista"),
      "Minha Lista",
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Erro ao criar lista");
    });
    expect(screen.getByPlaceholderText("Nome da Lista")).toBeInTheDocument();
  });

  it("does not create list when manual name is empty", async () => {
    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Manual/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(mocks.createList).not.toHaveBeenCalled();
  });

  it("cancels manual creation form", async () => {
    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Manual/i }),
    );
    expect(screen.getByPlaceholderText("Nome da Lista")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      screen.queryByPlaceholderText("Nome da Lista"),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      caseName: "owner list shows delete button",
      role: "owner" as const,
      shouldShowDelete: true,
    },
    {
      caseName: "viewer list hides delete button",
      role: "viewer" as const,
      shouldShowDelete: false,
    },
  ])(
    "renders role behavior for $caseName",
    async ({ role, shouldShowDelete }) => {
      mocks.lists = [
        {
          id: "list-1",
          name: "List",
          owner_id: "owner-1",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          role,
        },
      ];

      renderCustomLists();

      await screen.findByText("List");

      expect(screen.queryByTitle("Excluir Lista") !== null).toBe(
        shouldShowDelete,
      );
    },
  );

  it("deletes list and shows success toast", async () => {
    mocks.lists = [
      {
        id: "list-1",
        name: "List",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
    ];

    renderCustomLists();

    await screen.findByText("List");
    await userEvent.click(screen.getByTitle("Excluir Lista"));
    await userEvent.click(
      screen.getByRole("button", { name: "confirm-delete" }),
    );

    await waitFor(() => {
      expect(mocks.deleteList).toHaveBeenCalledWith("list-1");
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Lista excluída com sucesso",
    );
  });

  it("returns early when delete is confirmed without selected list", async () => {
    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: "confirm-delete" }),
    );

    expect(mocks.deleteList).not.toHaveBeenCalled();
  });

  it("closes delete modal through onClose callback", async () => {
    renderCustomLists();

    await userEvent.click(screen.getByRole("button", { name: "close-delete" }));

    expect(mocks.deleteList).not.toHaveBeenCalled();
  });

  it("shows error toast when delete fails", async () => {
    mocks.lists = [
      {
        id: "list-1",
        name: "List",
        owner_id: "owner-1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        role: "owner",
      },
    ];
    mocks.deleteList.mockRejectedValue(new Error("delete failed"));

    renderCustomLists();

    await screen.findByText("List");
    await userEvent.click(screen.getByTitle("Excluir Lista"));
    await userEvent.click(
      screen.getByRole("button", { name: "confirm-delete" }),
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Erro ao excluir lista");
    });
  });

  it("saves magic list by creating list and adding items", async () => {
    mocks.createList.mockResolvedValue({
      id: "new-list",
      name: "Magic List",
      owner_id: "owner-1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      role: "owner",
    });

    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Inteligente/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "save-magic" }));

    await waitFor(() => {
      expect(mocks.createList).toHaveBeenCalledWith("Magic List");
    });
    expect(mocks.addListItems).toHaveBeenCalledWith({
      listId: "new-list",
      items: expect.arrayContaining([
        expect.objectContaining({ id: 10, media_type: "movie" }),
        expect.objectContaining({ id: 20, media_type: "tv" }),
      ]),
    });
  });

  it("propagates magic list save error to modal and shows error path", async () => {
    mocks.createList.mockRejectedValue(new Error("create failed"));

    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Inteligente/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "save-magic" }));

    await waitFor(() => {
      expect(mocks.createList).toHaveBeenCalled();
    });
  });

  it("rollbacks created list when batch insert fails", async () => {
    mocks.createList.mockResolvedValue({
      id: "new-list",
      name: "Magic List",
      owner_id: "owner-1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      role: "owner",
    });
    mocks.addListItems.mockRejectedValue(new Error("batch insert failed"));

    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Inteligente/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "save-magic" }));

    await waitFor(() => {
      expect(mocks.createList).toHaveBeenCalled();
      expect(mocks.addListItems).toHaveBeenCalled();
      expect(mocks.deleteList).toHaveBeenCalledWith("new-list");
    });
  });

  it("logs error when rollback deletion also fails", async () => {
    const logger = (await import("@/lib/logger")).logger;
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    mocks.createList.mockResolvedValue({
      id: "new-list",
      name: "Magic List",
      owner_id: "owner-1",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      role: "owner",
    });
    mocks.addListItems.mockRejectedValue(new Error("batch insert failed"));
    mocks.deleteList.mockRejectedValue(new Error("rollback delete failed"));

    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Inteligente/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "save-magic" }));

    await waitFor(() => {
      expect(loggerSpy).toHaveBeenCalledWith(
        "Rollback failed:",
        expect.any(Error),
      );
    });

    loggerSpy.mockRestore();
  });

  it("closes magic modal through onClose callback", async () => {
    renderCustomLists();

    await userEvent.click(
      screen.getByRole("button", { name: /Lista Inteligente/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "close-magic" }));

    expect(
      screen.queryByRole("button", { name: "save-magic" }),
    ).not.toBeInTheDocument();
  });
});
