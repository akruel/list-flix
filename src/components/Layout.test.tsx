import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Layout } from "./Layout";

const mocks = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    className,
    children,
  }: {
    to: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href="https://test.com" data-to={to} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="layout-outlet" />,
  useLocation: () => ({ pathname: mocks.pathname }),
}));

vi.mock("./LoginButton", () => ({
  LoginButton: () => <div data-testid="login-button" />,
}));

vi.mock("./NotificationToggle", () => ({
  NotificationToggle: () => <div data-testid="notification-toggle" />,
}));

vi.mock("./SearchModal", () => ({
  SearchModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (
    <button data-testid="search-modal" data-open={isOpen} onClick={onClose}>
      search-modal-content
    </button>
  ),
}));

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { caseName: "home route", pathname: "/", activeLabel: "Início" },
    {
      caseName: "nested lists route",
      pathname: "/lists/abc",
      activeLabel: "Minhas Listas",
    },
  ])("marks active links for $caseName", ({ pathname, activeLabel }) => {
    mocks.pathname = pathname;

    render(<Layout />);

    expect(screen.getByTestId("layout-outlet")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeInTheDocument();

    const activeLinks = screen.getAllByRole("link", { name: activeLabel });
    expect(activeLinks.length).toBeGreaterThan(0);
    activeLinks.forEach((link) => {
      expect(link.className).toContain("text-primary");
    });
  });

  it.each([
    {
      caseName: "activity route",
      pathname: "/activity",
      activeLabel: "Atividades",
    },
  ])(
    "marks $activeLabel as active on $caseName",
    ({ pathname, activeLabel }) => {
      mocks.pathname = pathname;

      render(<Layout />);

      const links = screen.getAllByRole("link", { name: activeLabel });
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link.className).toContain("text-primary");
      });
    },
  );

  it("keeps non-active links muted", () => {
    mocks.pathname = "/activity";

    render(<Layout />);

    const homeLinks = screen.getAllByRole("link", { name: "Início" });
    homeLinks.forEach((link) => {
      expect(link.className).toContain("text-muted-foreground");
    });
  });

  it("opens search modal when + button is clicked", async () => {
    const user = userEvent.setup();
    render(<Layout />);

    const buttons = screen.getAllByTestId(/search-open-button/);
    expect(buttons.length).toBe(2);

    await user.click(buttons[0]);

    const modal = screen.getByTestId("search-modal");
    expect(modal).toHaveAttribute("data-open", "true");
  });

  it("opens search modal when mobile + button is clicked", async () => {
    const user = userEvent.setup();
    render(<Layout />);

    await user.click(screen.getByTestId("search-open-button-mobile"));

    const modal = screen.getByTestId("search-modal");
    expect(modal).toHaveAttribute("data-open", "true");
  });

  it("closes search modal when onClose is triggered", async () => {
    const user = userEvent.setup();
    render(<Layout />);

    await user.click(screen.getByTestId("search-open-button"));

    const modal = screen.getByTestId("search-modal");
    expect(modal).toHaveAttribute("data-open", "true");

    await user.click(modal);

    expect(modal).toHaveAttribute("data-open", "false");
  });
});
