import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="https://test.com">{children}</a>
  ),
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

vi.mock("@/hooks/mutations", () => ({
  useToggleWatchlist: () => ({ mutate: vi.fn() }),
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

function renderModal(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SearchModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchFn.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when isOpen is false", () => {
    const { container } = renderModal(
      <SearchModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders when isOpen is true", () => {
    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("search-modal-input")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal(<SearchModal isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /Fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears a pending debounce when closing", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    renderModal(<SearchModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByTestId("search-modal-input"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Fechar/i }));

    vi.advanceTimersByTime(500);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it("shows loading skeletons while searching", async () => {
    mockSearchFn.mockReturnValue(new Promise(() => {}));

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  it("shows empty state when search returns no results", async () => {
    mockSearchFn.mockResolvedValue({ results: [] });

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

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

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

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

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

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

    renderModal(<SearchModal isOpen={true} onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles search error gracefully", async () => {
    mockSearchFn.mockRejectedValue(new Error("network error"));

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("search-modal-input"), "test");

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum resultado encontrado."),
      ).toBeInTheDocument();
    });
  });

  it("ignores stale results from an older request", async () => {
    let resolveFirst:
      | ((value: {
          results: Array<{ id: number; title: string; media_type: string }>;
        }) => void)
      | undefined;
    let resolveSecond:
      | ((value: {
          results: Array<{ id: number; title: string; media_type: string }>;
        }) => void)
      | undefined;

    mockSearchFn
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    renderModal(<SearchModal isOpen={true} onClose={vi.fn()} />);

    const user = userEvent.setup();
    const input = screen.getByTestId("search-modal-input");

    await user.type(input, "a");

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenCalledTimes(1);
    });

    await user.clear(input);
    await user.type(input, "ab");

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenCalledTimes(2);
    });

    resolveSecond?.({
      results: [{ id: 202, title: "New Result", media_type: "movie" }],
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("search-result-item")).toHaveLength(1);
    });

    resolveFirst?.({
      results: [{ id: 101, title: "Old Result", media_type: "movie" }],
    });

    await waitFor(() => {
      const items = screen.getAllByTestId("search-result-item");
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute("data-item-title", "New Result");
    });
  });
});
