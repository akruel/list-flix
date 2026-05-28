import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePushNotification } from "./usePushNotification";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  supabaseFrom: vi.fn(),
}));

const validVapidKey =
  "BFFNRZb6k8jpYQQ0Dw8Jv0wKBZtlrMsY4IOHQILhsPJrWGH7ivxebSTjRhhWU_44ScVF8rqMj_RJSyLdN_FSQYU";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
}));

interface MockPushSubscription {
  toJSON(): {
    endpoint: string | null;
    keys: { p256dh: string; auth: string } | null;
  };
  unsubscribe?: ReturnType<typeof vi.fn>;
}

interface MockServiceWorker {
  getRegistration: ReturnType<typeof vi.fn>;
  ready: Promise<ServiceWorkerRegistration>;
}

function createMockRegistration() {
  return {
    active: {} as ServiceWorker,
    pushManager: {
      getSubscription: vi.fn(),
      subscribe: vi.fn(),
    },
  };
}

function createQueryBuilder() {
  const select = vi.fn();
  const eq = vi.fn();
  const deleteFn = vi.fn();
  const maybeSingle = vi.fn();
  const upsert = vi.fn();

  select.mockReturnThis();
  eq.mockReturnThis();
  deleteFn.mockReturnThis();
  maybeSingle.mockResolvedValue({ data: null, error: null });
  upsert.mockResolvedValue({ error: null });

  return { select, eq, delete: deleteFn, maybeSingle, upsert };
}

function stubBrowserApis(sw: MockServiceWorker) {
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: vi.fn().mockResolvedValue("granted"),
  });

  vi.stubGlobal("PushManager", {});

  Object.defineProperty(navigator, "serviceWorker", {
    value: sw,
    configurable: true,
    writable: true,
  });

  vi.stubEnv("VITE_VAPID_PUBLIC_KEY", validVapidKey);
}

describe("usePushNotification", () => {
  let reg: ReturnType<typeof createMockRegistration>;
  let builder: ReturnType<typeof createQueryBuilder>;
  let subscription: MockPushSubscription;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    reg = createMockRegistration();

    builder = createQueryBuilder();
    mocks.supabaseFrom.mockReturnValue(builder);

    subscription = {
      toJSON: () => ({
        endpoint: "https://push.test/endpoint",
        keys: { p256dh: "key123", auth: "auth456" },
      }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    reg.pushManager.getSubscription.mockResolvedValue(null);
    reg.pushManager.subscribe.mockResolvedValue(subscription);

    const getRegistration = vi.fn().mockResolvedValue(reg);
    const ready = Promise.resolve(reg as unknown as ServiceWorkerRegistration);

    stubBrowserApis({ getRegistration, ready });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ---------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------

  it("returns isSupported as false when PushManager is not available", () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;

    mocks.useAuth.mockReturnValue({ user: null, status: "none" });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    expect(result.current.isSupported).toBe(false);
  });

  it("returns isSupported as true when browser APIs are available", () => {
    mocks.useAuth.mockReturnValue({ user: null, status: "none" });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    expect(result.current.isSupported).toBe(true);
  });

  // ---------------------------------------------------------------
  // checkSubscriptionStatus
  // ---------------------------------------------------------------

  it("sets isSubscribed to false when user is not authenticated", async () => {
    mocks.useAuth.mockReturnValue({ user: null, status: "none" });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  it("checks subscription status when user is authenticated", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({
      data: { id: "sub-1" },
      error: null,
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(mocks.supabaseFrom).toHaveBeenCalledWith("push_subscriptions");
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it("sets isSubscribed to false when supabase returns no subscription", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  it("handles supabase error when checking subscription status", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("DB check error"),
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(mocks.supabaseFrom).toHaveBeenCalled();
    });

    expect(result.current.isSubscribed).toBe(false);
  });

  it("does not set state when subscription check resolves after unmount", async () => {
    let resolveCheck!: (value: unknown) => void;
    builder.maybeSingle.mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result, unmount } = renderHook(() => usePushNotification(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mocks.supabaseFrom).toHaveBeenCalledWith("push_subscriptions");
    });

    expect(result.current.isSubscribed).toBe(false);

    unmount();

    resolveCheck({ data: { id: "sub-1" }, error: null });
  });

  // ---------------------------------------------------------------
  // getActiveRegistration paths
  // ---------------------------------------------------------------

  it("sets swReady via ready fallback when registration has no active worker", async () => {
    const fallbackReg = { active: null, pushManager: {} };

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue(fallbackReg),
        ready: Promise.resolve(reg as unknown as ServiceWorkerRegistration),
      },
      configurable: true,
      writable: true,
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
  });

  it("sets swReady to false when ready rejects and no active registration", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ active: null }),
        ready: Promise.reject(new Error("SW failed")),
      },
      configurable: true,
      writable: true,
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // subscribe
  // ---------------------------------------------------------------

  it("subscribe saves push subscription to supabase", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    await result.current.subscribe();

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    expect(reg.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });

    expect(builder.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        endpoint: "https://push.test/endpoint",
        p256dh: "key123",
        auth: "auth456",
      },
      { onConflict: "user_id" },
    );
  });

  it("subscribe throws when VAPID key is not configured", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    await expect(result.current.subscribe()).rejects.toThrow(
      "VAPID public key not configured",
    );
  });

  it("subscribe handles permission denial", async () => {
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    await expect(result.current.subscribe()).rejects.toThrow(
      "Permission denied",
    );
  });

  it("subscribe throws when service worker is not available", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ active: null }),
        ready: Promise.reject(new Error("gone")),
      },
      configurable: true,
      writable: true,
    });

    await expect(result.current.subscribe()).rejects.toThrow(
      "Service worker not available",
    );
  });

  it("subscribe unsubscribes existing browser subscription first", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const existingSub = { unsubscribe: vi.fn().mockResolvedValue(undefined) };
    reg.pushManager.getSubscription.mockResolvedValue(existingSub);

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    await result.current.subscribe();

    expect(existingSub.unsubscribe).toHaveBeenCalled();
  });

  it("subscribe handles invalid push subscription response", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    reg.pushManager.subscribe.mockResolvedValue({
      toJSON: () => ({ endpoint: null, keys: null }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    await expect(result.current.subscribe()).rejects.toThrow(
      "Invalid push subscription",
    );
  });

  it("subscribe unsubscribes browser sub when upsert fails", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    builder.upsert.mockResolvedValue({ error: new Error("Upsert failed") });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    const unsubscribeSpy = vi.fn().mockResolvedValue(undefined);
    reg.pushManager.subscribe.mockResolvedValue({
      toJSON: () => ({
        endpoint: "https://push.test/endpoint",
        keys: { p256dh: "key123", auth: "auth456" },
      }),
      unsubscribe: unsubscribeSpy,
    });

    await expect(result.current.subscribe()).rejects.toThrow("Upsert failed");
    expect(unsubscribeSpy).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  it("updates permission state when requesting permission", async () => {
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    expect(result.current.permission).toBe("default");

    await result.current.subscribe();

    await waitFor(() => {
      expect(result.current.permission).toBe("granted");
    });
  });

  // ---------------------------------------------------------------
  // unsubscribe
  // ---------------------------------------------------------------

  it("unsubscribe removes subscription from supabase and browser", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({
      data: { id: "sub-1" },
      error: null,
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    await result.current.unsubscribe();

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  it("unsubscribe throws when supabase delete fails", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    builder.delete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: new Error("DB error") }),
    });

    await expect(result.current.unsubscribe()).rejects.toThrow("DB error");
  });

  it("unsubscribe removes existing browser subscription", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({
      data: { id: "sub-1" },
      error: null,
    });

    const existingSub = { unsubscribe: vi.fn().mockResolvedValue(undefined) };
    reg.pushManager.getSubscription.mockResolvedValue(existingSub);

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });

    await result.current.unsubscribe();

    expect(existingSub.unsubscribe).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // Guard branches (swReady=false, no serviceWorker, insert error)
  // ---------------------------------------------------------------

  it("getActiveRegistration returns null when serviceWorker is absent", () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;

    mocks.useAuth.mockReturnValue({ user: null, status: "none" });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    expect(result.current.swReady).toBe(false);
  });

  it("subscribe is no-op when swReady is false", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ active: null }),
        ready: Promise.reject(new Error("gone")),
      },
      configurable: true,
      writable: true,
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(false);
    });

    // Should resolve without error (no-op)
    await expect(result.current.subscribe()).resolves.toBeUndefined();
    expect(result.current.isSubscribing).toBe(false);
  });

  it("unsubscribe is no-op when swReady is false", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ active: null }),
        ready: Promise.reject(new Error("gone")),
      },
      configurable: true,
      writable: true,
    });

    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(false);
    });

    await expect(result.current.unsubscribe()).resolves.toBeUndefined();
    expect(result.current.isUnsubscribing).toBe(false);
  });

  it("subscribe throws when upsert fails", async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "user-1" },
      status: "authenticated",
    });

    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
    builder.upsert.mockResolvedValue({ error: new Error("Upsert failed") });

    const { result } = renderHook(() => usePushNotification(), { wrapper });

    await waitFor(() => {
      expect(result.current.swReady).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    await expect(result.current.subscribe()).rejects.toThrow("Upsert failed");
  });
});
