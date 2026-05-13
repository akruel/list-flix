import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "./UserMenu";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    signOut: mocks.signOut,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
  });

  async function openLogoutDialog() {
    render(
      <UserMenu
        user={{
          id: "user-1",
          displayName: "Alice",
          email: "alice@example.com",
          provider: "email",
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /sair/i }));
  }

  it("renders fallback user labels when displayName and email are missing", () => {
    render(
      <UserMenu
        user={{
          id: "user-1",
          provider: "email",
        }}
      />,
    );

    expect(screen.getByText("Usuário")).toBeInTheDocument();
    expect(screen.getByText("Sem email")).toBeInTheDocument();
  });

  it("handles sign out success", async () => {
    mocks.signOut.mockResolvedValue(undefined);
    await openLogoutDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const confirmButton = screen.getAllByRole("button", { name: "Sair" });
    await userEvent.click(confirmButton[confirmButton.length - 1]);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/auth",
        replace: true,
      });
      expect(mocks.toastError).not.toHaveBeenCalled();
    });
  });

  it("handles sign out failure", async () => {
    mocks.signOut.mockRejectedValue(new Error("failed"));
    await openLogoutDialog();

    const confirmButton = screen.getAllByRole("button", { name: "Sair" });
    await userEvent.click(confirmButton[confirmButton.length - 1]);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledOnce();
      expect(mocks.navigate).not.toHaveBeenCalled();
      expect(mocks.toastError).toHaveBeenCalledOnce();
    });
  });
});
