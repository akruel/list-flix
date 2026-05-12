import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListSelectionModal } from "./ListSelectionModal";

const mocks = vi.hoisted(() => ({
  useAuthValue: {
    user: { id: "test-user-id" },
    status: "authenticated",
  },
  storeValue: {
    myList: [] as Array<{
      tmdb_id: number;
      tags?: Array<{ tag: string; partner_user_id?: string }>;
    }>,
    isInList: vi.fn(),
    addToListWithTags: vi.fn(),
    removeFromList: vi.fn(),
    partners: [] as Array<{
      id: string;
      user_id: string;
      partner_user_id: string;
    }>,
    availableUsers: [] as Array<{ user_id: string; display_name: string }>,
    fetchPartners: vi.fn(),
  },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mocks.useAuthValue,
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

  it("shows assistir_com tag with partner name in existing tags", () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [
      {
        tmdb_id: 10,
        tags: [{ tag: "assistir_com", partner_user_id: "pu1" }],
      },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "pu1", display_name: "My Partner" },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Assistir com My Partner")).toBeInTheDocument();
  });

  it("shows assistir_com tag with fallback name when partner user not found", () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [
      {
        tmdb_id: 10,
        tags: [{ tag: "assistir_com", partner_user_id: "unknown-id" }],
      },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    expect(screen.getByText("Assistir com ...")).toBeInTheDocument();
  });

  it("calls addToListWithTags when adding", async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByText("Adicionar à Lista"));

    expect(mocks.storeValue.addToListWithTags).toHaveBeenCalledWith(
      content,
      [],
      undefined,
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
    expect(screen.getByText("Assistir com")).toBeInTheDocument();
  });

  it("shows partner select in tag selector when assistir_com is selected", async () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "test-user-id", partner_user_id: "pu1" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "pu1", display_name: "My Partner" },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByTestId("tag-selector-assistir_com"));

    expect(screen.getByText("My Partner")).toBeInTheDocument();
  });

  it("selects partner from dropdown and adds with partner_user_id", async () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "test-user-id", partner_user_id: "pu1" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "pu1", display_name: "My Partner" },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByTestId("tag-selector-assistir_com"));
    await userEvent.selectOptions(
      screen.getByTestId("tag-selector-partner"),
      "pu1",
    );
    await userEvent.click(screen.getByText("Adicionar à Lista"));

    expect(mocks.storeValue.addToListWithTags).toHaveBeenCalledWith(
      content,
      ["assistir_com"],
      "pu1",
    );
  });

  it("shows partner option when partner user_id does not match current user", async () => {
    mocks.storeValue.partners = [
      { id: "p2", user_id: "other-user-id", partner_user_id: "pu2" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "pu1", display_name: "Partner Found" },
    ];

    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByTestId("tag-selector-assistir_com"));

    expect(screen.getByText("Usuário")).toBeInTheDocument();
  });

  it("calls removeFromList and closes when removing with tags", async () => {
    mocks.storeValue.isInList.mockReturnValue(true);
    mocks.storeValue.myList = [
      { tmdb_id: 10, tags: [{ tag: "fim_de_semana" }] },
    ];
    const onClose = vi.fn();

    render(<ListSelectionModal isOpen onClose={onClose} content={content} />);

    expect(screen.getByText("Fim de Semana")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Remover da Lista"));
    expect(mocks.storeValue.removeFromList).toHaveBeenCalledWith(10);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("selects and deselects tags via tag selector inside modal", async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    const tagButton = screen.getByTestId("tag-selector-noite_de_pipoca");
    await userEvent.click(tagButton);
    expect(tagButton.className).toContain("border-purple-500");

    await userEvent.click(tagButton);
    expect(tagButton.className).not.toContain("border-purple-500");
  });

  it("calls addToListWithTags with selected tags and closes", async () => {
    render(<ListSelectionModal isOpen onClose={vi.fn()} content={content} />);

    await userEvent.click(screen.getByTestId("tag-selector-noite_de_pipoca"));
    await userEvent.click(screen.getByTestId("tag-selector-fim_de_semana"));
    await userEvent.click(screen.getByText("Adicionar à Lista"));

    expect(mocks.storeValue.addToListWithTags).toHaveBeenCalledWith(
      content,
      ["noite_de_pipoca", "fim_de_semana"],
      undefined,
    );
  });
});
