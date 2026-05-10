import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  usePushNotification: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock("@/hooks/usePushNotification", () => ({
  usePushNotification: () => mocks.usePushNotification(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock("lucide-react", () => ({
  Bell: () => <div data-testid="bell-icon" />,
  BellOff: () => <div data-testid="bell-off-icon" />,
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader-icon" className={className} />
  ),
}));

import { NotificationToggle } from "./NotificationToggle";

describe("NotificationToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ status: "authenticated" });
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when push is not supported", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: false,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    const { container } = render(<NotificationToggle />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when sw is not ready", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: false,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    const { container } = render(<NotificationToggle />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when user is not logged in", () => {
    mocks.useAuth.mockReturnValue({ status: "none" });
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    const { container } = render(<NotificationToggle />);
    expect(container.innerHTML).toBe("");
  });

  it("renders Bell icon when not subscribed", () => {
    render(<NotificationToggle />);

    expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
  });

  it("renders BellOff icon when subscribed", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: true,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);

    expect(screen.getByTestId("bell-off-icon")).toBeInTheDocument();
  });

  it("renders Loader when subscribing", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: true,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("renders Loader when unsubscribing", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: true,
      isSubscribing: false,
      isUnsubscribing: true,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("calls subscribe on click when not subscribed", async () => {
    const subscribe = vi.fn().mockResolvedValue(undefined);
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe,
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Notificações ativadas!");
  });

  it("calls unsubscribe on click when subscribed", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(undefined);
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: true,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe,
    });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Notificações desativadas");
  });

  it("shows error toast when subscribe fails with permission denied", async () => {
    const subscribe = vi.fn().mockRejectedValue(new Error("Permission denied"));
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe,
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Permissão negada. Verifique as configurações do navegador.",
    );
  });

  it("shows generic error toast when subscribe fails with other error", async () => {
    const subscribe = vi.fn().mockRejectedValue(new Error("Something else"));
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe,
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Erro ao ativar notificações",
    );
  });

  it("shows error toast when unsubscribe fails", async () => {
    const unsubscribe = vi.fn().mockRejectedValue(new Error("fail"));
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: true,
      isSubscribing: false,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe,
    });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Erro ao desativar notificações",
    );
  });

  it("disables button while busy", () => {
    mocks.usePushNotification.mockReturnValue({
      isSupported: true,
      swReady: true,
      isSubscribed: false,
      isSubscribing: true,
      isUnsubscribing: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationToggle />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
