// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DetailsActions } from "./DetailsActions";

describe("DetailsActions", () => {
  it("renders add and watched buttons with correct labels", () => {
    render(
      <DetailsActions
        isSaved={false}
        watched={false}
        onToggleList={vi.fn()}
        onToggleWatched={vi.fn()}
      />,
    );

    expect(screen.getByTestId("details-add-button")).toHaveTextContent(
      "Adicionar",
    );
    expect(
      screen.getByTestId("details-toggle-watched-button"),
    ).toHaveTextContent("Marcar");
  });

  it("shows saved and watched states", () => {
    render(
      <DetailsActions
        isSaved
        watched
        onToggleList={vi.fn()}
        onToggleWatched={vi.fn()}
      />,
    );

    expect(screen.getByTestId("details-add-button")).toHaveTextContent("Salvo");
    expect(
      screen.getByTestId("details-toggle-watched-button"),
    ).toHaveTextContent("Assistido");
  });

  it("calls toggle handlers on click", async () => {
    const user = userEvent.setup();
    const onToggleList = vi.fn();
    const onToggleWatched = vi.fn();

    render(
      <DetailsActions
        isSaved={false}
        watched={false}
        onToggleList={onToggleList}
        onToggleWatched={onToggleWatched}
      />,
    );

    await user.click(screen.getByTestId("details-add-button"));
    await user.click(screen.getByTestId("details-toggle-watched-button"));

    expect(onToggleList).toHaveBeenCalledTimes(1);
    expect(onToggleWatched).toHaveBeenCalledTimes(1);
  });
});
