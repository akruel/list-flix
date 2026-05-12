import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TagSelector } from "./TagSelector";

describe("TagSelector", () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both tag options", () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    expect(screen.getByText("Noite de Pipoca")).toBeInTheDocument();
    expect(screen.getByText("Fim de Semana")).toBeInTheDocument();
    expect(screen.getByText("Filmes leves e divertidos")).toBeInTheDocument();
    expect(screen.getByText("Maratona ou binge-watch")).toBeInTheDocument();
  });

  it("shows selected state for active tags", () => {
    render(
      <TagSelector selectedTags={["noite_de_pipoca"]} onToggle={onToggle} />,
    );

    const button = screen.getByTestId("tag-selector-noite_de_pipoca");
    expect(button).toHaveClass("border-purple-500");
  });

  it("shows inactive state for unselected tags", () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    const button = screen.getByTestId("tag-selector-noite_de_pipoca");
    expect(button).toHaveClass("border-gray-700");
  });

  it("calls onToggle when a tag is clicked", async () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId("tag-selector-noite_de_pipoca"));
    expect(onToggle).toHaveBeenCalledWith("noite_de_pipoca");
  });

  it("calls onToggle for fim_de_semana tag", async () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId("tag-selector-fim_de_semana"));
    expect(onToggle).toHaveBeenCalledWith("fim_de_semana");
  });
});
