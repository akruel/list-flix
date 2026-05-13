import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  authStateChangeCallback: undefined as
    | ((event: string, session: unknown) => void)
    | undefined,
  unsubscribe: vi.fn(),
  getUserProfile: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      onAuthStateChange: (...args: unknown[]) =>
        mocks.onAuthStateChange(...args),
    },
  },
}));

vi.mock("../services/auth", () => ({
  authService: {
    getUserProfile: (...args: unknown[]) => mocks.getUserProfile(...args),
    signInWithGoogle: (...args: unknown[]) => mocks.signInWithGoogle(...args),
    signInWithOtp: (...args: unknown[]) => mocks.signInWithOtp(...args),
    signOut: (...args: unknown[]) => mocks.signOut(...args),
  },
}));

function AuthConsumer() {
  const {
    status,
    user,
    refreshProfile,
    signInWithGoogle,
    signInWithOtp,
    signOut,
  } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user-id">{user?.id ?? "none"}</span>
      <button type="button" onClick={() => void refreshProfile()}>
        refresh
      </button>
      <button type="button" onClick={() => void signInWithGoogle()}>
        google
      </button>
      <button
        type="button"
        onClick={() => void signInWithOtp("alice@example.com")}
      >
        otp
      </button>
      <button type="button" onClick={() => void signOut()}>
        signout
      </button>
    </div>
  );
}

function renderWithProvider(children: ReactNode = <AuthConsumer />) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: null },
    });
    mocks.getUserProfile.mockResolvedValue(null);
    mocks.signInWithGoogle.mockResolvedValue(undefined);
    mocks.signInWithOtp.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
    mocks.onAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        mocks.authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mocks.unsubscribe,
            },
          },
        };
      },
    );
  });

  it("throws when useAuth is used outside provider", () => {
    expect(() => render(<AuthConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("sets none status when initial session is missing", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
      expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    });
  });

  it("loads authenticated profile from initial session", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
      },
    });
    mocks.getUserProfile.mockResolvedValue({
      id: "user-1",
      provider: "google",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-1");
    });
  });

  it("sets none when profile cannot be loaded for existing session", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
      },
    });
    mocks.getUserProfile.mockResolvedValue(null);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
    });
  });

  it("handles auth state change callback", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
    });
    mocks.getUserProfile.mockResolvedValue({
      id: "user-2",
      provider: "email",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
    });

    mocks.authStateChangeCallback?.("SIGNED_IN", { access_token: "token" });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-2");
    });
  });

  it("refreshProfile updates status and user", async () => {
    mocks.getUserProfile.mockResolvedValue({
      id: "user-1",
      provider: "google",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
    });

    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-1");
    });
  });

  it("refreshProfile sets authenticated status", async () => {
    mocks.getUserProfile.mockResolvedValue({
      id: "user-99",
      provider: "google",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
    });

    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-99");
    });
  });

  it("refreshProfile clears state when profile is missing", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
      },
    });
    mocks.getUserProfile.mockResolvedValue({
      id: "user-1",
      provider: "email",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    mocks.getUserProfile.mockResolvedValue(null);

    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
      expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    });
  });

  it("ignores stale applySession result when a newer auth update arrives first", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstProfilePromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: "initial" },
      },
    });
    mocks.getUserProfile
      .mockImplementationOnce(() => firstProfilePromise)
      .mockResolvedValueOnce({
        id: "newer-user",
        provider: "google",
      });

    renderWithProvider();

    mocks.authStateChangeCallback?.("SIGNED_IN", { access_token: "newer" });

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("newer-user");
    });

    resolveFirst?.({
      id: "stale-user",
      provider: "email",
    });
    await Promise.resolve();

    expect(screen.getByTestId("user-id")).toHaveTextContent("newer-user");
  });

  it("calls context auth actions", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("none");
    });

    await userEvent.click(screen.getByRole("button", { name: "google" }));
    await userEvent.click(screen.getByRole("button", { name: "otp" }));
    await userEvent.click(screen.getByRole("button", { name: "signout" }));

    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce();
    expect(mocks.signInWithOtp).toHaveBeenCalledWith("alice@example.com");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("unsubscribes from auth listener on unmount", async () => {
    const { unmount } = renderWithProvider();

    await waitFor(() => {
      expect(mocks.getSession).toHaveBeenCalled();
    });

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not apply initial session after unmount when initialize resolves late", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    const delayedSessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });
    mocks.getSession.mockImplementation(() => delayedSessionPromise);

    const { unmount } = renderWithProvider();
    unmount();

    resolveSession?.({
      data: {
        session: { access_token: "late" },
      },
    });
    await Promise.resolve();

    expect(mocks.getUserProfile).not.toHaveBeenCalled();
  });
});
