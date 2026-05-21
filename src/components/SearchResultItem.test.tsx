import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a
      href="https://test.com"
      data-to={props.to}
      data-params={JSON.stringify(props.params)}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockAddToList = vi.fn();
vi.mock("@/store/useStore", () => ({
  useStore: {
    getState: () => ({ addToList: mockAddToList }),
  },
}));

import { SearchResultItem } from "./SearchResultItem";

const mockItem = {
  id: 101,
  title: "Mock Movie 101",
  media_type: "movie" as const,
  vote_average: 7.8,
  release_date: "2025-01-01",
};

describe("SearchResultItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and type", () => {
    render(<SearchResultItem item={mockItem} />);

    expect(screen.getByText("Mock Movie 101")).toBeInTheDocument();
    expect(screen.getByText("Filme")).toBeInTheDocument();
  });

  it("renders add button", () => {
    render(<SearchResultItem item={mockItem} />);

    expect(screen.getByTitle("Adicionar à lista")).toBeInTheDocument();
  });

  it("calls addToList when add button is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchResultItem item={mockItem} />);

    await user.click(screen.getByTitle("Adicionar à lista"));

    expect(mockAddToList).toHaveBeenCalledWith(mockItem);
  });

  it("renders link to details page", () => {
    render(<SearchResultItem item={mockItem} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-to", "/details/$type/$id");
  });

  it("renders TV series with Série label and name", () => {
    const tvItem = {
      id: 201,
      name: "Mock TV Show",
      media_type: "tv" as const,
      vote_average: 8.1,
      first_air_date: "2023-06-15",
    };

    render(<SearchResultItem item={tvItem} />);

    expect(screen.getByText("Mock TV Show")).toBeInTheDocument();
    expect(screen.getByText("Série")).toBeInTheDocument();
  });

  it("renders without rating when vote_average is missing", () => {
    const itemNoRating = {
      id: 301,
      title: "No Rating",
      media_type: "movie" as const,
    };

    render(<SearchResultItem item={itemNoRating} />);

    expect(screen.getByText("No Rating")).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("shows error toast when addToList throws", async () => {
    const user = userEvent.setup();
    mockAddToList.mockImplementation(() => {
      throw new Error("add failed");
    });

    render(<SearchResultItem item={mockItem} />);

    await user.click(screen.getByTitle("Adicionar à lista"));

    // The error should be logged and a toast shown
    const { logger } = await import("@/lib/logger");
    expect(logger.error).toHaveBeenCalledWith(
      "Error adding to list:",
      expect.any(Error),
    );
  });
});
