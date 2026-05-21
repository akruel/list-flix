import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="https://test.com">{children}</a>
  ),
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

vi.mock("@/store/useStore", () => ({
  useStore: {
    getState: () => ({ addToList: vi.fn() }),
  },
}));

const { mockSearchFn } = vi.hoisted(() => ({
  mockSearchFn: vi.fn(),
}));

vi.mock("@/services/tmdb", () => ({
  tmdb: {
    search: mockSearchFn,
  },
}));

const mockResultItems: Array<{ id: number; title: string }> = [];
vi.mock("./SearchResultItem", () => ({
  SearchResultItem: ({ item }: { item: { id: number; title: string } }) => {
    mockResultItems.push(item);
    return (
      <div data-testid="search-result-item" data-item-title={item.title} />
    );
  },
}));

vi.mock("./ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { SearchModal } from "./SearchModal";

describe("SearchModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchFn.mockReset();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SearchModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders when isOpen is true", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("search-modal-input")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SearchModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /Fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading skeletons while searching", async () => {
    mockSearchFn.mockReturnValue(new Promise(() => {}));

    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  it("shows empty state when search returns no results", async () => {
    mockSearchFn.mockResolvedValue({ results: [] });

    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum resultado encontrado."),
      ).toBeInTheDocument();
    });
  });

  it("shows results items when search succeeds", async () => {
    mockSearchFn.mockResolvedValue({
      results: [
        { id: 101, title: "Movie A", media_type: "movie" },
        { id: 202, name: "Show B", media_type: "tv" },
      ],
    });

    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      const items = screen.getAllByTestId("search-result-item");
      expect(items).toHaveLength(2);
    });
  });

  it("clears results when input is cleared", async () => {
    mockSearchFn.mockResolvedValue({
      results: [{ id: 101, title: "Movie", media_type: "movie" }],
    });

    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    const input = screen.getByTestId("search-modal-input");

    await user.type(input, "test");

    await waitFor(() => {
      expect(
        screen.queryAllByTestId("search-result-item").length,
      ).toBeGreaterThan(0);
    });

    mockSearchFn.mockClear();

    await user.clear(input);

    await waitFor(() => {
      expect(screen.queryAllByTestId("search-result-item").length).toBe(0);
    });
  });

  it("closes on Escape key press", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<SearchModal isOpen={true} onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles search error gracefully", async () => {
    mockSearchFn.mockRejectedValue(new Error("network error"));

    render(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum resultado encontrado."),
      ).toBeInTheDocument();
    });
  });
});
