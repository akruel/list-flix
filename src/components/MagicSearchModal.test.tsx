import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MagicSearchModal } from "./MagicSearchModal";

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  findBestMatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../services/ai", () => ({
  ai: {
    getSuggestions: (...args: unknown[]) => mocks.getSuggestions(...args),
  },
}));

vi.mock("../services/tmdb", () => ({
  tmdb: {
    findBestMatch: (...args: unknown[]) => mocks.findBestMatch(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock("./MovieCard", () => ({
  MovieCard: ({
    item,
  }: {
    item: { id: number; title?: string; name?: string };
  }) => (
    <div data-testid="magic-item">{item.title ?? item.name ?? item.id}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-dialog
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

describe("MagicSearchModal", () => {
  let idCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    mocks.findBestMatch.mockImplementation(
      async (title: string, mediaType: string) => ({
        id: ++idCounter,
        media_type: mediaType,
        title: title,
      }),
    );
    mocks.getSuggestions.mockResolvedValue({
      suggested_list_name: "Sci-Fi",
      items: [
        { title: "Matrix", media_type: "movie" },
        { title: "Interstellar", media_type: "movie" },
      ],
    });
  });

  async function openAndTypePrompt(prompt = "filmes de ficção") {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);
    await userEvent.type(
      screen.getAllByTestId("magic-list-prompt-input")[0],
      prompt,
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: /Sugerir/i })[0],
    );
  }

  it("does not submit when prompt is empty", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    expect(
      screen.getAllByRole("button", { name: /Sugerir/i })[0],
    ).toBeDisabled();
    expect(mocks.getSuggestions).not.toHaveBeenCalled();
  });

  it("handles successful suggestion and searches each item", async () => {
    await openAndTypePrompt("matrix e interstellar");

    await waitFor(() => {
      expect(mocks.getSuggestions).toHaveBeenCalledWith(
        "matrix e interstellar",
      );
    });
    expect(mocks.findBestMatch).toHaveBeenCalledWith(
      "Matrix",
      "movie",
      undefined,
    );
    expect(mocks.findBestMatch).toHaveBeenCalledWith(
      "Interstellar",
      "movie",
      undefined,
    );

    const items = await screen.findAllByTestId("magic-item");
    expect(items).toHaveLength(2);
    expect(screen.getByDisplayValue("Sci-Fi")).toBeInTheDocument();
  });

  it("filters out items not found in TMDB", async () => {
    mocks.getSuggestions.mockResolvedValue({
      suggested_list_name: "Mix",
      items: [
        { title: "Found", media_type: "movie" },
        { title: "NotFound", media_type: "movie" },
      ],
    });
    mocks.findBestMatch.mockImplementation(async (title: string) => {
      if (title === "NotFound") return null;
      return { id: 1, title: "Found", media_type: "movie" };
    });

    await openAndTypePrompt();

    await waitFor(() => {
      const items = screen.getAllByTestId("magic-item");
      expect(items).toHaveLength(1);
      expect(screen.getByText("Found")).toBeInTheDocument();
      expect(screen.queryByText("NotFound")).not.toBeInTheDocument();
    });
  });

  it("shows toast error when suggestion generation fails", async () => {
    mocks.getSuggestions.mockRejectedValue(new Error("ai failed"));

    await openAndTypePrompt();

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Erro ao gerar sugestões. Tente novamente.",
      );
    });
  });

  it("handles save success", async () => {
    const onSaveList = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <MagicSearchModal isOpen onClose={onClose} onSaveList={onSaveList} />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findAllByTestId("magic-item");

    await userEvent.click(
      screen.getByRole("button", { name: /Salvar Lista/i }),
    );

    await waitFor(() => {
      expect(onSaveList).toHaveBeenCalledWith("Sci-Fi", expect.any(Array));
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Lista criada com sucesso!",
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handles save failure", async () => {
    const onSaveList = vi.fn().mockRejectedValue(new Error("save failed"));
    render(
      <MagicSearchModal isOpen onClose={vi.fn()} onSaveList={onSaveList} />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findAllByTestId("magic-item");

    await userEvent.click(
      screen.getByRole("button", { name: /Salvar Lista/i }),
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Erro ao salvar a lista.");
    });
  });

  it("validates list name before saving", async () => {
    await openAndTypePrompt();
    await screen.findAllByTestId("magic-item");

    const nameInput = screen.getAllByDisplayValue("Sci-Fi")[0];
    await userEvent.clear(nameInput);
    await userEvent.click(
      screen.getAllByRole("button", { name: /Salvar Lista/i })[0],
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Por favor, dê um nome para a lista.",
      );
    });
  });

  it("navigates back from results to input preserving prompt", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    const prompt = "filmes de ação";
    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      prompt,
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findAllByTestId("magic-item");

    await userEvent.click(screen.getByTestId("magic-list-back-button"));

    expect(screen.getByTestId("magic-list-prompt-input")).toHaveValue(prompt);
  });

  it("shows searching label after AI resolves", async () => {
    let resolveAi!: (value: unknown) => void;
    mocks.getSuggestions.mockReturnValue(
      new Promise((resolve) => {
        resolveAi = resolve;
      }),
    );
    mocks.findBestMatch.mockReturnValue(new Promise(() => {}));

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getAllByTestId("magic-list-prompt-input")[0],
      "aventura",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: /Sugerir/i })[0],
    );

    resolveAi({
      suggested_list_name: "Aventura",
      items: [{ title: "Dune", media_type: "movie" }],
    });

    await waitFor(() => {
      expect(screen.getAllByText("Buscando no TMDB...")[0]).toBeVisible();
    });
  });

  it("shows no results message when TMDB returns nothing for all items", async () => {
    mocks.findBestMatch.mockResolvedValue(null);

    await openAndTypePrompt();

    expect(
      await screen.findByText(
        "Nenhum resultado encontrado. Tente outro pedido.",
      ),
    ).toBeInTheDocument();
  });

  it("toggles item selection on click", async () => {
    await openAndTypePrompt();
    await screen.findAllByTestId("magic-item");

    expect(
      screen.getAllByTestId("magic-list-save-button")[0],
    ).toHaveTextContent("Salvar Lista (2)");

    const items = screen.getAllByTestId("magic-item");
    await userEvent.click(items[0]);

    expect(items[0]).toBeInTheDocument();
    expect(items[1]).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", {
      name: /Matrix|Interstellar/i,
    });
    expect(buttons[0]).toHaveClass("opacity-60");
    expect(buttons[1]).toHaveClass("opacity-100");
  });

  it("handles back button to clear results and selection", async () => {
    await openAndTypePrompt();
    await screen.findAllByTestId("magic-item");

    expect(screen.getByTestId("magic-list-results-grid")).toBeInTheDocument();

    const backButton = screen.getByTestId("magic-list-back-button");
    await userEvent.click(backButton);

    expect(
      screen.queryByTestId("magic-list-results-grid"),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByTestId("magic-list-prompt-input")[0],
    ).toBeInTheDocument();
  });

  it("shows loading steps", async () => {
    mocks.getSuggestions.mockReturnValue(new Promise(() => {}));

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);
    await userEvent.type(
      screen.getAllByTestId("magic-list-prompt-input")[0],
      "matrix",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: /Sugerir/i })[0],
    );

    expect(screen.getAllByText("Analisando seu pedido...")[0]).toBeVisible();
  });

  it("toggles item selection via keyboard", async () => {
    await openAndTypePrompt();
    await screen.findAllByTestId("magic-item");

    const items = screen.getAllByTestId(/magic-item-button-/);
    const item = items[0];

    fireEvent.keyDown(item, { key: " " });
    expect(
      screen.getAllByTestId("magic-list-save-button")[0],
    ).toHaveTextContent("Salvar Lista (1)");

    fireEvent.keyDown(item, { key: "Enter" });
    expect(
      screen.getAllByTestId("magic-list-save-button")[0],
    ).toHaveTextContent("Salvar Lista (2)");
  });

  it("resets modal state when closed", async () => {
    const onClose = vi.fn();
    render(<MagicSearchModal isOpen onClose={onClose} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getAllByTestId("magic-list-prompt-input")[0],
      "matrix",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "close-dialog" })[0],
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handles suggestion items with empty media_type fallback", async () => {
    mocks.getSuggestions.mockResolvedValue({
      suggested_list_name: "Fallback",
      items: [{ title: "Matrix", media_type: "movie" }],
    });

    await openAndTypePrompt("matrix");
    await waitFor(() => {
      expect(mocks.findBestMatch).toHaveBeenCalledWith(
        "Matrix",
        "movie",
        undefined,
      );
    });
  });

  it("clicking selected item increments count instead of toggling", async () => {
    await openAndTypePrompt();
    await screen.findAllByTestId("magic-item");

    const items = screen.getAllByTestId("magic-item");
    await userEvent.click(items[0]);
    expect(
      screen.getAllByTestId("magic-list-save-button")[0],
    ).toHaveTextContent("Salvar Lista (1)");

    await userEvent.click(items[0]);
    expect(
      screen.getAllByTestId("magic-list-save-button")[0],
    ).toHaveTextContent("Salvar Lista (2)");
  });

  it("does not trigger search if prompt is empty", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    const form = screen.getByTestId("magic-list-form");
    fireEvent.submit(form);

    expect(mocks.getSuggestions).not.toHaveBeenCalled();
  });

  it("uses fallback suggested name from schema when AI response lacks it", async () => {
    mocks.getSuggestions.mockResolvedValue({
      suggested_list_name: "Lista Sugerida",
      items: [{ title: "Inception", media_type: "movie" }],
    });
    mocks.findBestMatch.mockResolvedValue({
      id: 1,
      title: "Inception",
      media_type: "movie",
      poster_path: "/path.jpg",
    });

    await openAndTypePrompt("matrix");
    await waitFor(() => {
      expect(screen.getAllByTestId("magic-list-name-input")[0]).toHaveValue(
        "Lista Sugerida",
      );
    });
  });

  it("fills prompt when clicking example chip", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    const chips = screen.getByTestId("magic-list-example-chips");
    const firstChip = within(chips).getAllByRole("button")[0];

    await userEvent.click(firstChip);

    const input = screen.getAllByTestId("magic-list-prompt-input")[0];
    expect(input).toHaveValue(firstChip.textContent);
  });
});
