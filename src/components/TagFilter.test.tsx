import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TagFilter } from "./TagFilter";

describe("TagFilter", () => {
  const counts = { noite_de_pipoca: 3, fim_de_semana: 2 };
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both tag buttons with counts", () => {
    render(<TagFilter activeTags={[]} onToggle={onToggle} counts={counts} />);

    expect(screen.getByText(/Noite de Pipoca.*3/)).toBeInTheDocument();
    expect(screen.getByText(/Fim de Semana.*2/)).toBeInTheDocument();
  });

  it("shows active state for selected tags", () => {
    render(
      <TagFilter
        activeTags={["noite_de_pipoca"]}
        onToggle={onToggle}
        counts={counts}
      />,
    );

    const button = screen.getByTestId("tag-filter-noite_de_pipoca");
    expect(button.className).toContain("bg-purple-600");
  });

  it("shows inactive state for non-selected tags", () => {
    render(<TagFilter activeTags={[]} onToggle={onToggle} counts={counts} />);

    const button = screen.getByTestId("tag-filter-noite_de_pipoca");
    expect(button.className).toContain("bg-gray-800");
  });

  it("calls onToggle when clicked", async () => {
    render(<TagFilter activeTags={[]} onToggle={onToggle} counts={counts} />);

    await userEvent.click(screen.getByTestId("tag-filter-noite_de_pipoca"));
    expect(onToggle).toHaveBeenCalledWith("noite_de_pipoca");
  });

  it("renders zero counts correctly", () => {
    render(
      <TagFilter
        activeTags={[]}
        onToggle={onToggle}
        counts={{ noite_de_pipoca: 0, fim_de_semana: 0 }}
      />,
    );

    expect(screen.getByText(/Noite de Pipoca.*0/)).toBeInTheDocument();
  });
});
