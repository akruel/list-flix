// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchModalProvider, useSearchModal } from "./SearchModalContext";

function Probe() {
  const { isOpen, openSearch, closeSearch } = useSearchModal();

  return (
    <div>
      <span data-testid="state">{isOpen ? "open" : "closed"}</span>
      <button type="button" onClick={openSearch}>
        open
      </button>
      <button type="button" onClick={closeSearch}>
        close
      </button>
    </div>
  );
}

describe("SearchModalContext", () => {
  it("opens and closes search modal state", async () => {
    const user = userEvent.setup();

    render(
      <SearchModalProvider>
        <Probe />
      </SearchModalProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("closed");

    await user.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByTestId("state")).toHaveTextContent("open");

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("throws when hook is used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow(
      "useSearchModal must be used within a SearchModalProvider",
    );

    consoleError.mockRestore();
  });
});
