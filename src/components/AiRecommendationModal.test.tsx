import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  addToListWithTags: vi.fn(),
}));

vi.mock("@/services/ai", () => ({
  ai: { getSuggestions: mocks.getSuggestions },
}));

vi.mock("@/store/useStore", () => ({
  useStore: () => ({
    addToListWithTags: mocks.addToListWithTags,
  }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
      <button data-testid="dialog-close" onClick={() => onOpenChange(false)}>
        close
      </button>
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/MovieCard", () => ({
  MovieCard: ({ item }: { item: { title?: string } }) => (
    <div data-testid="movie-card">{item.title}</div>
  ),
}));

import { AiRecommendationModal } from "./AiRecommendationModal";

describe("AiRecommendationModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders prompt step when open", () => {
    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText("Recomendações com IA")).toBeDefined();
    expect(screen.getByTestId("ai-prompt-input")).toBeDefined();
    expect(screen.getByTestId("ai-recommend-button")).toBeDefined();
  });

  it("disables recommend button when prompt is empty", () => {
    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    expect(screen.getByTestId("ai-recommend-button")).toBeDisabled();
  });

  it("enables recommend button when prompt has text", async () => {
    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");

    expect(screen.getByTestId("ai-recommend-button")).not.toBeDisabled();
  });

  it("shows loading state while recommending", async () => {
    mocks.getSuggestions.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                items: [],
                suggested_tags: [],
              }),
            100,
          ),
        ),
    );

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    expect(screen.getByText("Recomendando...")).toBeDefined();
  });

  it("shows results step after successful recommendation", async () => {
    mocks.getSuggestions.mockResolvedValue({
      items: [
        { title: "The Shining", media_type: "movie" },
        { title: "Hereditary", media_type: "movie" },
      ],
      suggested_tags: ["fim_de_semana"],
    });

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-add-to-list")).toBeDefined();
    });

    expect(screen.getByText("Adicionar à Minha Lista (2)")).toBeDefined();
  });

  it("calls addToListWithTags when adding to list", async () => {
    mocks.getSuggestions.mockResolvedValue({
      items: [
        { title: "The Shining", media_type: "movie" },
        { title: "Hereditary", media_type: "movie" },
      ],
      suggested_tags: ["fim_de_semana"],
    });

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-add-to-list")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("ai-add-to-list"));

    expect(mocks.addToListWithTags).toHaveBeenCalledTimes(2);
    expect(mocks.addToListWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ title: "The Shining" }),
      ["fim_de_semana"],
    );
  });

  it("selects/deselects/re-selects items by clicking", async () => {
    mocks.getSuggestions.mockResolvedValue({
      items: [
        { title: "The Shining", media_type: "movie" },
        { title: "Hereditary", media_type: "movie" },
        { title: "Get Out", media_type: "movie" },
      ],
      suggested_tags: [],
    });

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByText("Adicionar à Minha Lista (3)")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("ai-result-item-0"));

    expect(screen.getByText("Adicionar à Minha Lista (2)")).toBeDefined();

    fireEvent.click(screen.getByTestId("ai-result-item-0"));

    expect(screen.getByText("Adicionar à Minha Lista (3)")).toBeDefined();
  });

  it("does not call API when prompt is empty", async () => {
    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    expect(mocks.getSuggestions).not.toHaveBeenCalled();
  });

  it("toggles suggested tags off and back on", async () => {
    mocks.getSuggestions.mockResolvedValue({
      items: [
        { title: "The Shining", media_type: "movie" },
        { title: "Hereditary", media_type: "movie" },
      ],
      suggested_tags: ["noite_de_pipoca", "fim_de_semana"],
    });

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-add-to-list")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("tag-selector-noite_de_pipoca"));
    fireEvent.click(screen.getByTestId("tag-selector-fim_de_semana"));
    fireEvent.click(screen.getByTestId("tag-selector-noite_de_pipoca"));

    fireEvent.click(screen.getByTestId("ai-add-to-list"));

    expect(mocks.addToListWithTags).toHaveBeenCalledWith(expect.anything(), [
      "noite_de_pipoca",
    ]);
  });

  it("shows error when recommendation fails", async () => {
    mocks.getSuggestions.mockRejectedValue(new Error("API Error"));

    render(<AiRecommendationModal isOpen={true} onClose={onClose} />);

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-error")).toBeDefined();
    });

    expect(screen.getByTestId("ai-error").textContent).toBe(
      "Não foi possível obter recomendações. Tente novamente.",
    );
  });

  it("resets state when closing", async () => {
    mocks.getSuggestions.mockResolvedValue({
      items: [{ title: "The Shining", media_type: "movie" }],
      suggested_tags: [],
    });

    const { rerender } = render(
      <AiRecommendationModal isOpen={true} onClose={onClose} />,
    );

    const input = screen.getByTestId("ai-prompt-input");
    await userEvent.type(input, "filmes de terror");
    fireEvent.click(screen.getByTestId("ai-recommend-button"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-add-to-list")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("dialog-close"));

    expect(onClose).toHaveBeenCalled();

    rerender(<AiRecommendationModal isOpen={false} onClose={onClose} />);

    expect(screen.queryByTestId("ai-add-to-list")).toBeNull();
  });
});
