import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListSelectionModal } from "./ListSelectionModal";

const mocks = vi.hoisted(() => ({
  storeValue: {
    myList: [] as Array<{ tmdb_id: number; tags?: Array<{ tag: string }> }>,
    isInList: vi.fn(),
    addToListWithTags: vi.fn(),
    removeFromList: vi.fn(),
  },
}));

vi.mock("../store/useStore", () => ({
  useStore: () => mocks.storeValue,
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

describe("ListSelectionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeValue.myList = [];
    mocks.storeValue.isInList.mockReturnValue(false);
  });

  const content = {
    id: 10,
    media_type: "movie" as const,
    title: "Movie",
  };

  it("shows add mode when item is not in list", () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Adicionar à Minha Lista")).toBeInTheDocument();
    expect(screen.getByText("Adicionar à Lista")).toBeInTheDocument();
  });

  it("shows remove mode when item is in list", () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [
      { tmdb_id: 10, tags: [{ tag: "noite_de_pipoca" }] },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Minha Lista")).toBeInTheDocument();
    expect(screen.getByText("Remover da Lista")).toBeInTheDocument();
  });

  it("shows existing tags when item is in list", () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [
      { tmdb_id: 10, tags: [{ tag: "noite_de_pipoca" }] },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Noite de Pipoca")).toBeInTheDocument();
  });

  it("calls addToListWithTags when adding", async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByText("Adicionar à Lista"));

    expect(mocks.storeValue.addToListWithTags).toHaveBeenCalledWith(
      content,
      [],
    );
  });

  it("calls removeFromList when removing", async () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [{ tmdb_id: 10, tags: [] }];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByText("Remover da Lista"));

    expect(mocks.storeValue.removeFromList).toHaveBeenCalledWith(10);
  });

  it("closes modal when concluído button is clicked", async () => {
    const onClose = vi.fn();
    render(<ListSelectionModal isOpen onClose={onClose} content={content} />);

    await userEvent.click(screen.getByText("Concluído"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handles dialog close via onOpenChange(false)", async () => {
    const onClose = vi.fn();
    render(<ListSelectionModal isOpen onClose={onClose} content={content} />);

    await userEvent.click(screen.getByText("dialog-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores dialog onOpenChange(true)", async () => {
    const onClose = vi.fn();
    render(<ListSelectionModal isOpen onClose={onClose} content={content} />);

    await userEvent.click(screen.getByText("dialog-open"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows tag selector in add mode", () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Noite de Pipoca")).toBeInTheDocument();
    expect(screen.getByText("Fim de Semana")).toBeInTheDocument();
  });
});
