// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "../lib/supabase";
import { authService } from "./auth";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedSupabase = supabase as unknown as {
  auth: {
    getUser: MockFn;
    getSession: MockFn;
    signInWithOAuth: MockFn;
    signInWithOtp: MockFn;
    signOut: MockFn;
    updateUser: MockFn;
  };
};

const USER_1 = { id: "user-1", email: "alice@example.com" };

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signInWithGoogle", () => {
    it("calls supabase signInWithOAuth with google provider", async () => {
      mockedSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      await authService.signInWithGoogle();

      expect(mockedSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    });

    it("throws when sign in fails", async () => {
      mockedSupabase.auth.signInWithOAuth.mockResolvedValue({
        error: new Error("oauth failed"),
      });

      await expect(authService.signInWithGoogle()).rejects.toThrow(
        "oauth failed",
      );
    });
  });

  describe("signInWithOtp", () => {
    it("calls supabase signInWithOtp with email", async () => {
      mockedSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      await authService.signInWithOtp("alice@example.com");

      expect(mockedSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "alice@example.com",
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });

    it("throws when OTP fails", async () => {
      mockedSupabase.auth.signInWithOtp.mockResolvedValue({
        error: new Error("otp failed"),
      });

      await expect(
        authService.signInWithOtp("alice@example.com"),
      ).rejects.toThrow("otp failed");
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut", async () => {
      mockedSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authService.signOut();

      expect(mockedSupabase.auth.signOut).toHaveBeenCalledOnce();
    });

    it("throws when sign out fails", async () => {
      mockedSupabase.auth.signOut.mockResolvedValue({
        error: new Error("signout failed"),
      });

      await expect(authService.signOut()).rejects.toThrow("signout failed");
    });
  });

  describe("getUserId", () => {
    it("returns user id when user exists", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: USER_1 },
      });

      const result = await authService.getUserId();

      expect(result).toBe("user-1");
    });

    it("returns null when no user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await authService.getUserId();

      expect(result).toBeNull();
    });
  });

  describe("getUserProfile", () => {
    it.each([
      {
        caseName: "google user",
        user: {
          id: "user-1",
          email: "alice@gmail.com",
          app_metadata: { provider: "google" },
          user_metadata: {
            full_name: "Alice",
            avatar_url: "https://example.com/avatar.jpg",
          },
        },
        expected: {
          id: "user-1",
          email: "alice@gmail.com",
          displayName: "Alice",
          avatarUrl: "https://example.com/avatar.jpg",
          provider: "google",
        },
      },
      {
        caseName: "email user with display_name",
        user: {
          id: "user-2",
          email: "bob@example.com",
          app_metadata: { provider: "email" },
          user_metadata: { display_name: "Bob" },
        },
        expected: {
          id: "user-2",
          email: "bob@example.com",
          displayName: "Bob",
          avatarUrl: undefined,
          provider: "email",
        },
      },
      {
        caseName: "unknown provider fallback",
        user: {
          id: "user-3",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
        },
        expected: {
          id: "user-3",
          email: "test@example.com",
          displayName: "test",
          avatarUrl: undefined,
          provider: "unknown",
        },
      },
      {
        caseName: "user with picture metadata instead of avatar_url",
        user: {
          id: "user-6",
          email: "dave@example.com",
          app_metadata: { provider: "google" },
          user_metadata: { picture: "https://example.com/pic.jpg" },
        },
        expected: {
          id: "user-6",
          email: "dave@example.com",
          displayName: "dave",
          avatarUrl: "https://example.com/pic.jpg",
          provider: "google",
        },
      },
      {
        caseName:
          "user without email or metadata falls back to undefined displayName",
        user: {
          id: "user-5",
          app_metadata: {},
          user_metadata: {},
        },
        expected: {
          id: "user-5",
          email: undefined,
          displayName: undefined,
          avatarUrl: undefined,
          provider: "unknown",
        },
      },
      {
        caseName: "user without email uses name metadata",
        user: {
          id: "user-4",
          app_metadata: { provider: "google" },
          user_metadata: { name: "Charlie" },
        },
        expected: {
          id: "user-4",
          email: undefined,
          displayName: "Charlie",
          avatarUrl: undefined,
          provider: "google",
        },
      },
    ])("returns profile for $caseName", async ({ user, expected }) => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user },
      });

      const profile = await authService.getUserProfile();

      expect(profile).toEqual(expected);
    });

    it("returns null when no user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const profile = await authService.getUserProfile();

      expect(profile).toBeNull();
    });
  });

  describe("finalizePostLogin", () => {
    it("calls ensureDisplayName", async () => {
      const spy = vi
        .spyOn(authService, "ensureDisplayName")
        .mockResolvedValue();

      await authService.finalizePostLogin();

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });

  describe("ensureDisplayName", () => {
    it("sets display_name from email when no display name exists", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "alice@example.com",
            user_metadata: {},
          },
        },
      });
      mockedSupabase.auth.updateUser.mockResolvedValue({ error: null });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { display_name: "alice" },
      });
    });

    it("skips update when display name already exists", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "alice@example.com",
            user_metadata: { display_name: "Alice" },
          },
        },
      });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("skips update when full_name already exists", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "alice@example.com",
            user_metadata: { full_name: "Alice" },
          },
        },
      });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("skips update when name already exists in metadata", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "alice@example.com",
            user_metadata: { name: "Alice" },
          },
        },
      });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("skips update when no email", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            user_metadata: {},
          },
        },
      });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("does nothing when no user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await authService.ensureDisplayName();

      expect(mockedSupabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("post-login target", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("saves invite path", () => {
      authService.savePostLoginTarget("/lists/abc123/join");

      expect(localStorage.getItem("auth_post_login_target")).toBe(
        "/lists/abc123/join",
      );
    });

    it("does not save non-invite path", () => {
      authService.savePostLoginTarget("/home");

      expect(localStorage.getItem("auth_post_login_target")).toBeNull();
    });

    it("consumes and removes target", () => {
      localStorage.setItem("auth_post_login_target", "/lists/abc123/join");

      const result = authService.consumePostLoginTarget();

      expect(result).toBe("/lists/abc123/join");
      expect(localStorage.getItem("auth_post_login_target")).toBeNull();
    });

    it("returns null when no target stored", () => {
      expect(authService.consumePostLoginTarget()).toBeNull();
    });

    it("returns null when saved target is not an invite path", () => {
      localStorage.setItem("auth_post_login_target", "/home");

      const result = authService.consumePostLoginTarget();

      expect(result).toBeNull();
      expect(localStorage.getItem("auth_post_login_target")).toBeNull();
    });

    it("gets target without removing", () => {
      localStorage.setItem("auth_post_login_target", "/lists/abc123/join");

      const result = authService.getPostLoginTarget();

      expect(result).toBe("/lists/abc123/join");
      expect(localStorage.getItem("auth_post_login_target")).toBe(
        "/lists/abc123/join",
      );
    });

    it("getPostLoginTarget returns null for non-invite path", () => {
      localStorage.setItem("auth_post_login_target", "/search");

      const result = authService.getPostLoginTarget();

      expect(result).toBeNull();
      expect(localStorage.getItem("auth_post_login_target")).toBe("/search");
    });
  });
});
