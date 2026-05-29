// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ListItemWithContent } from "./ListItemsGrid";
import { ListItemsGrid } from "./ListItemsGrid";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  watchedIds: [10] as number[],
  userContent: {
    watchlist: [],
    watchedIds: [10],
    watchedEpisodes: {
      10: {
        1: { season_number: 1, episode_number: 1 },
        2: { season_number: 0, episode_number: 1 },
      },
    },
    seriesMetadata: {
      10: { total_episodes: 10, number_of_seasons: 1 },
    },
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/mutations", () => ({
  useRemoveListItem: () => ({ mutateAsync: mocks.mutateAsync }),
}));

vi.mock("@/hooks/userContent", () => ({
  useUserContent: () => mocks.userContent,
  useWatchedIds: () => mocks.watchedIds,
}));

vi.mock("@/components/MovieCard", () => ({
  MovieCard: ({
    watched,
    seriesWatchedCount,
  }: {
    watched?: boolean;
    seriesWatchedCount?: number;
  }) => (
    <div
      data-testid="movie-card"
      data-watched={String(watched)}
      data-series-count={seriesWatchedCount ?? 0}
    />
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@/components/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({
    isOpen,
    onConfirm,
    onClose,
    description,
    isDeleting,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
    description: string;
    isDeleting?: boolean;
  }) =>
    isOpen ? (
      <div data-testid="remove-modal">
        <p>{description}</p>
        {isDeleting ? <span>removing</span> : null}
        <button type="button" onClick={onConfirm}>
          confirm
        </button>
        <button type="button" onClick={onClose}>
          cancel
        </button>
      </div>
    ) : null,
}));

function renderGrid(
  ui: ReactElement,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const tvItem: ListItemWithContent = {
  id: "item-1",
  list_id: "list-1",
  content_id: 10,
  content_type: "tv",
  added_by: "user-1",
  created_at: "2024-01-01T00:00:00Z",
  content: {
    id: 10,
    media_type: "tv",
    name: "Show",
    first_air_date: "2020-01-01",
  },
};

describe("ListItemsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutateAsync.mockResolvedValue(undefined);
    mocks.userContent = {
      watchlist: [],
      watchedIds: [10],
      watchedEpisodes: {
        10: {
          1: { season_number: 1, episode_number: 1 },
          2: { season_number: 0, episode_number: 1 },
        },
      },
      seriesMetadata: {
        10: { total_episodes: 10, number_of_seasons: 1 },
      },
    };
  });

  it("passes watched and series progress props from user content", async () => {
    renderGrid(
      <ListItemsGrid listId="list-1" canEdit={false} items={[tvItem]} />,
    );

    const card = await screen.findByTestId("movie-card");
    expect(card).toHaveAttribute("data-watched", "true");

    await waitFor(() => {
      expect(card).toHaveAttribute("data-series-count", "1");
    });
  });

  it("shows loading skeleton when content is loading", () => {
    renderGrid(
      <ListItemsGrid
        listId="list-1"
        canEdit={false}
        items={[{ ...tvItem, content: undefined, isContentLoading: true }]}
      />,
    );

    expect(
      screen.getByTestId("list-item-content-skeleton"),
    ).toBeInTheDocument();
  });

  it("shows unavailable placeholder when content is missing", () => {
    renderGrid(
      <ListItemsGrid
        listId="list-1"
        canEdit={false}
        items={[{ ...tvItem, content: undefined, isContentLoading: false }]}
      />,
    );

    expect(screen.getByText("Conteúdo indisponível")).toBeInTheDocument();
  });

  it("shows empty list hint only when editing is allowed", () => {
    const { rerender } = renderGrid(
      <ListItemsGrid listId="list-1" canEdit={true} items={[]} />,
    );

    expect(screen.getByText("Esta lista está vazia")).toBeInTheDocument();
    expect(
      screen.getByText("Adicione filmes e séries para começar."),
    ).toBeInTheDocument();

    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <ListItemsGrid listId="list-1" canEdit={false} items={[]} />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByText("Adicione filmes e séries para começar."),
    ).not.toBeInTheDocument();
  });

  it("removes an item after confirmation", async () => {
    const user = userEvent.setup();

    renderGrid(
      <ListItemsGrid listId="list-1" canEdit={true} items={[tvItem]} />,
    );

    await user.click(screen.getByRole("button", { name: "Remover item" }));
    expect(screen.getByTestId("remove-modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        itemId: "item-1",
        listId: "list-1",
        contentId: 10,
        contentType: "tv",
      });
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Item removido com sucesso",
      );
    });
  });

  it("shows toast error when remove fails", async () => {
    mocks.mutateAsync.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();

    renderGrid(
      <ListItemsGrid listId="list-1" canEdit={true} items={[tvItem]} />,
    );

    await user.click(screen.getByRole("button", { name: "Remover item" }));
    await user.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Falha ao remover item");
    });
  });
});
