import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginButton } from "./LoginButton";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock("./UserMenu", () => ({
  UserMenu: ({ user }: { user: { displayName?: string } }) => (
    <div data-testid="user-menu">{user.displayName ?? "user"}</div>
  ),
}));

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton while auth status is loading", () => {
    mocks.useAuth.mockReturnValue({
      status: "loading",
      user: null,
    });

    render(<LoginButton />);

    expect(screen.getByTestId("login-button-skeleton")).toBeInTheDocument();
  });

  it("renders user menu when user is authenticated", () => {
    mocks.useAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "user-1",
        displayName: "Alice",
      },
    });

    render(<LoginButton />);

    expect(screen.getByTestId("user-menu")).toHaveTextContent("Alice");
  });

  it("navigates to auth page when unauthenticated", async () => {
    mocks.useAuth.mockReturnValue({
      status: "none",
      user: null,
    });

    render(<LoginButton />);

    await userEvent.click(screen.getByRole("button"));

    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth" });
  });
});
