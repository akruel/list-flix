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

interface PushMockOverrides {
  isSupported?: boolean;
  swReady?: boolean;
  swChecked?: boolean;
  isSubscribed?: boolean;
  isSubscribing?: boolean;
  isUnsubscribing?: boolean;
  subscribe?: ReturnType<typeof vi.fn>;
  unsubscribe?: ReturnType<typeof vi.fn>;
}

function mockPushNotification(overrides: PushMockOverrides = {}): void {
  mocks.usePushNotification.mockReturnValue({
    isSupported: true,
    swReady: true,
    swChecked: true,
    isSubscribed: false,
    isSubscribing: false,
    isUnsubscribing: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    ...overrides,
  });
}

describe("NotificationToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ status: "authenticated" });
    mockPushNotification({
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      caseName: "push is not supported",
      pushOverrides: { isSupported: false },
    },
    {
      caseName: "service worker check has not completed yet",
      pushOverrides: { swReady: false, swChecked: false },
    },
    {
      caseName: "service worker is not available",
      pushOverrides: { swReady: false },
    },
    {
      caseName: "user is not logged in",
      pushOverrides: {},
      authStatus: "none" as const,
    },
  ])("returns null when $caseName", ({ pushOverrides, authStatus }) => {
    if (authStatus) {
      mocks.useAuth.mockReturnValue({ status: authStatus });
    }
    mockPushNotification(pushOverrides);

    const { container } = render(<NotificationToggle />);
    expect(container.innerHTML).toBe("");
  });

  it.each([
    {
      caseName: "Bell icon when not subscribed",
      pushOverrides: { isSubscribed: false },
      expectedTestId: "bell-icon",
    },
    {
      caseName: "BellOff icon when subscribed",
      pushOverrides: { isSubscribed: true },
      expectedTestId: "bell-off-icon",
    },
    {
      caseName: "Loader when subscribing",
      pushOverrides: { isSubscribed: true, isUnsubscribing: true },
      expectedTestId: "loader-icon",
    },
    {
      caseName: "Loader when unsubscribing",
      pushOverrides: { isSubscribing: true },
      expectedTestId: "loader-icon",
    },
  ])("renders $caseName", ({ pushOverrides, expectedTestId }) => {
    mockPushNotification(pushOverrides);

    render(<NotificationToggle />);

    expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
  });

  it("calls subscribe on click when not subscribed", async () => {
    const subscribe = vi.fn().mockResolvedValue(undefined);
    mockPushNotification({ subscribe });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Notificações ativadas!");
  });

  it("calls unsubscribe on click when subscribed", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(undefined);
    mockPushNotification({ isSubscribed: true, unsubscribe });

    render(<NotificationToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Notificações desativadas");
  });

  it.each([
    {
      caseName: "subscribe fails with permission denied",
      isSubscribed: false,
      methodKey: "subscribe" as const,
      errorMessage: "Permission denied",
      expectedToast:
        "Permissão negada. Verifique as configurações do navegador.",
    },
    {
      caseName: "subscribe fails with other error",
      isSubscribed: false,
      methodKey: "subscribe" as const,
      errorMessage: "Something else",
      expectedToast: "Erro ao ativar notificações",
    },
    {
      caseName: "unsubscribe fails",
      isSubscribed: true,
      methodKey: "unsubscribe" as const,
      errorMessage: "fail",
      expectedToast: "Erro ao desativar notificações",
    },
  ])(
    "shows error toast when $caseName",
    async ({ isSubscribed, methodKey, errorMessage, expectedToast }) => {
      const failing = vi.fn().mockRejectedValue(new Error(errorMessage));
      mockPushNotification({
        isSubscribed,
        [methodKey]: failing,
      });

      render(<NotificationToggle />);
      await userEvent.click(screen.getByRole("button"));

      expect(mocks.toastError).toHaveBeenCalledWith(expectedToast);
    },
  );

  it("disables button while busy", () => {
    mockPushNotification({ isSubscribing: true });

    render(<NotificationToggle />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
