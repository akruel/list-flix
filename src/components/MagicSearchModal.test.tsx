import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MagicSearchModal } from "./MagicSearchModal";

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  search: vi.fn(),
  discover: vi.fn(),
  searchPerson: vi.fn(),
  searchPeople: vi.fn(),
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
    search: (...args: unknown[]) => mocks.search(...args),
    discover: (...args: unknown[]) => mocks.discover(...args),
    searchPerson: (...args: unknown[]) => mocks.searchPerson(...args),
    searchPeople: (...args: unknown[]) => mocks.searchPeople(...args),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockResolvedValue([
      { id: 1, media_type: "movie", title: "Movie A" },
    ]);
    mocks.discover.mockResolvedValue([
      { id: 2, media_type: "movie", title: "Movie B" },
    ]);
    mocks.searchPerson.mockResolvedValue(123);
    mocks.searchPeople.mockResolvedValue([{ id: 123, name: "Tom Cruise" }]);
    mocks.getSuggestions.mockResolvedValue({
      strategy: "search",
      query: "Matrix",
      suggested_list_name: "Sci-Fi",
    });
  });

  async function openAndTypePrompt(prompt = "filmes de ficção") {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      prompt,
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
  }

  it("does not submit when prompt is empty", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Sugerir/i })).toBeDisabled();
    expect(mocks.getSuggestions).not.toHaveBeenCalled();
  });

  it("returns early when submitting whitespace-only prompt", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "   ",
    );

    fireEvent.submit(screen.getByTestId("magic-list-form"));

    expect(mocks.getSuggestions).not.toHaveBeenCalled();
  });

  it.each([
    {
      caseName: "search strategy",
      filters: {
        strategy: "search",
        query: "Matrix",
        suggested_list_name: "Matrix list",
      },
      assertCalls: () => {
        expect(mocks.search).toHaveBeenCalledWith("Matrix", undefined);
      },
    },
    {
      caseName: "discover strategy",
      filters: {
        strategy: "discover",
        with_genres: "28",
        suggested_list_name: "Action list",
      },
      assertCalls: () => {
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ strategy: "discover", with_genres: "28" }),
        );
      },
    },
    {
      caseName: "person strategy with cast role",
      filters: {
        strategy: "person",
        person_name: "Tom Cruise",
        role: "cast",
        suggested_list_name: "Tom",
      },
      assertCalls: () => {
        expect(mocks.searchPeople).toHaveBeenCalledWith("Tom Cruise");
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ with_cast: 123 }),
        );
      },
    },
    {
      caseName: "person strategy with crew role",
      filters: {
        strategy: "person",
        person_name: "Nolan",
        role: "crew",
        suggested_list_name: "Nolan",
      },
      assertCalls: () => {
        expect(mocks.searchPeople).toHaveBeenCalledWith("Nolan");
        expect(mocks.discover).toHaveBeenCalledWith(
          expect.objectContaining({ with_crew: 123 }),
        );
      },
    },
  ])("handles $caseName", async ({ filters, assertCalls }) => {
    mocks.getSuggestions.mockResolvedValue(filters);

    await openAndTypePrompt();

    await waitFor(() => {
      assertCalls();
    });
    expect(await screen.findByTestId("magic-item")).toBeInTheDocument();
  });

  it("uses default suggested name when AI response omits suggested_list_name", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "discover",
      with_genres: "28",
    });

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "ação",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    expect(
      await screen.findByDisplayValue("Lista Sugerida"),
    ).toBeInTheDocument();
  });

  it("shows toast error when person is not found", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "person",
      person_name: "Unknown",
      role: "cast",
      suggested_list_name: "Unknown",
    });
    mocks.searchPeople.mockResolvedValue([]);

    await openAndTypePrompt();

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Pessoa não encontrada. Tente outro nome.",
      );
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

  it.each([
    {
      caseName: "save success",
      onSaveList: vi.fn().mockResolvedValue(undefined),
      shouldSuccess: true,
      shouldError: false,
    },
    {
      caseName: "save failure",
      onSaveList: vi.fn().mockRejectedValue(new Error("save failed")),
      shouldSuccess: false,
      shouldError: true,
    },
  ])(
    "handles $caseName",
    async ({ onSaveList, shouldSuccess, shouldError }) => {
      mocks.getSuggestions.mockResolvedValue({
        strategy: "search",
        query: "Matrix",
        suggested_list_name: "Sci-Fi",
      });
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
      await screen.findByTestId("magic-item");

      await userEvent.click(
        screen.getByRole("button", { name: /Salvar Lista/i }),
      );

      await waitFor(() => {
        expect(onSaveList).toHaveBeenCalledWith("Sci-Fi", expect.any(Array));
      });

      expect(mocks.toastSuccess).toHaveBeenCalledTimes(shouldSuccess ? 1 : 0);
      expect(mocks.toastSuccess.mock.calls[0]?.[0]).toBe(
        shouldSuccess ? "Lista criada com sucesso!" : undefined,
      );
      expect(onClose).toHaveBeenCalledTimes(shouldSuccess ? 1 : 0);
      expect(mocks.toastError).toHaveBeenCalledTimes(shouldError ? 1 : 0);
      expect(mocks.toastError.mock.calls[0]?.[0]).toBe(
        shouldError ? "Erro ao salvar a lista." : undefined,
      );
    },
  );

  it("validates list name before saving", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "search",
      query: "Matrix",
      suggested_list_name: "Sci-Fi",
    });

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findByTestId("magic-item");

    const nameInput = screen.getByDisplayValue("Sci-Fi");
    await userEvent.clear(nameInput);
    await userEvent.click(
      screen.getByRole("button", { name: /Salvar Lista/i }),
    );

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Por favor, dê um nome para a lista.",
    );
  });

  it("resets modal state when closed", async () => {
    const onClose = vi.fn();
    render(<MagicSearchModal isOpen onClose={onClose} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: "close-dialog" }));

    expect(onClose).toHaveBeenCalledOnce();
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
    await screen.findByTestId("magic-item");

    await userEvent.click(screen.getByTestId("magic-list-back-button"));

    expect(screen.getByTestId("magic-list-prompt-input")).toHaveValue(prompt);
    expect(screen.getByRole("button", { name: /Sugerir/i })).toBeVisible();
  });

  it("fills prompt when clicking example chip", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    const firstChip = screen.getAllByRole("button", {
      name: /Filmes de suspense/i,
    })[0];
    await userEvent.click(firstChip);

    const textareaValue = (
      screen.getByTestId("magic-list-prompt-input") as HTMLTextAreaElement
    ).value;
    expect(textareaValue.length).toBeGreaterThan(0);
  });

  it("shows loading state while generating suggestions", async () => {
    mocks.getSuggestions.mockReturnValue(new Promise(() => {}));

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    expect(screen.getByText("Analisando seu pedido...")).toBeVisible();
  });

  it("shows searching label after AI resolves", async () => {
    let resolveAi!: (value: unknown) => void;
    let resolveDiscover!: (value: unknown) => void;
    mocks.getSuggestions.mockReturnValue(
      new Promise((resolve) => {
        resolveAi = resolve;
      }),
    );
    mocks.discover.mockReturnValue(
      new Promise((resolve) => {
        resolveDiscover = resolve;
      }),
    );

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "aventura",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    resolveAi({
      strategy: "discover",
      media_type: "movie",
      suggested_list_name: "Aventura",
    });

    await waitFor(() => {
      expect(screen.getByText("Buscando no TMDB...")).toBeVisible();
    });

    resolveDiscover([{ id: 1, media_type: "movie", title: "Movie A" }]);
  });

  it("shows error toast when person change fails", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "person",
      person_name: "Tom",
      role: "cast",
      media_type: "movie",
      suggested_list_name: "Tom movies",
    });
    mocks.searchPeople.mockResolvedValue([
      { id: 123, name: "Tom Cruise" },
      { id: 456, name: "Tom Hanks" },
    ]);
    mocks.discover
      .mockResolvedValueOnce([{ id: 1, media_type: "movie", title: "Movie A" }])
      .mockRejectedValueOnce(new Error("discover failed"));

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "Tom",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    await screen.findByTestId("magic-list-person-selector");

    await userEvent.click(screen.getByTestId("magic-list-person-456"));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Erro ao buscar resultados.",
      );
    });
  });

  it("toggles item selection via keyboard", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findByTestId("magic-item");

    const item = screen.getByRole("button", { name: /Movie A/i });

    fireEvent.keyDown(item, { key: " " });
    expect(screen.getByText(/Salvar Lista \(0\)/)).toBeVisible();

    fireEvent.keyDown(item, { key: "Enter" });
    expect(screen.getByText(/Salvar Lista \(1\)/)).toBeVisible();
  });

  it("toggles item selection on click", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findByTestId("magic-item");

    expect(screen.getByText(/Salvar Lista \(1\)/)).toBeVisible();

    await userEvent.click(screen.getByTestId("magic-item"));

    expect(screen.getByText(/Salvar Lista \(0\)/)).toBeVisible();
  });

  it("disables save button when no items selected", async () => {
    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "matrix",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));
    await screen.findByTestId("magic-item");

    await userEvent.click(screen.getByTestId("magic-item"));

    expect(screen.getByTestId("magic-list-save-button")).toBeDisabled();
  });

  it("handles person change with crew role", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "person",
      person_name: "Director",
      role: "crew",
      media_type: "movie",
      suggested_list_name: "Director movies",
    });
    mocks.searchPeople.mockResolvedValue([
      { id: 789, name: "Christopher Nolan" },
      { id: 111, name: "Denis Villeneuve" },
    ]);
    mocks.discover
      .mockResolvedValueOnce([
        { id: 3, media_type: "movie", title: "Inception" },
      ])
      .mockResolvedValueOnce([{ id: 4, media_type: "movie", title: "Dune" }]);

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "Director",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    await screen.findByTestId("magic-list-person-selector");

    await userEvent.click(screen.getByTestId("magic-list-person-111"));

    await waitFor(() => {
      expect(mocks.discover).toHaveBeenCalledWith(
        expect.objectContaining({ with_crew: 111 }),
      );
    });
  });

  it("shows person selector and refetches on change", async () => {
    mocks.getSuggestions.mockResolvedValue({
      strategy: "person",
      person_name: "Tom",
      role: "cast",
      media_type: "movie",
      suggested_list_name: "Tom movies",
    });
    mocks.searchPeople.mockResolvedValue([
      { id: 123, name: "Tom Cruise" },
      { id: 456, name: "Tom Hanks" },
    ]);
    mocks.discover
      .mockResolvedValueOnce([{ id: 1, media_type: "movie", title: "Movie A" }])
      .mockResolvedValueOnce([
        { id: 2, media_type: "movie", title: "Movie B" },
      ]);

    render(<MagicSearchModal isOpen onClose={vi.fn()} onSaveList={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(
        "Ex: Filmes de suspense para assistir no final de semana...",
      ),
      "Tom",
    );
    await userEvent.click(screen.getByRole("button", { name: /Sugerir/i }));

    await screen.findByTestId("magic-list-person-selector");

    await userEvent.click(screen.getByTestId("magic-list-person-456"));

    await waitFor(() => {
      expect(mocks.discover).toHaveBeenCalledWith(
        expect.objectContaining({ with_cast: 456 }),
      );
    });
  });
});
