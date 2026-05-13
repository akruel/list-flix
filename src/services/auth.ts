import { supabase } from "../lib/supabase";
import type { AuthProvider, UserProfile } from "../types";

const AUTH_POST_LOGIN_TARGET_KEY = "auth_post_login_target";

const normalizePathname = (path: string): string => {
  const [pathname] = path.split("?");
  return pathname;
};

const isInvitePath = (path: string): boolean => {
  return /^\/lists\/[^/]+\/join$/.test(normalizePathname(path));
};

export const authService = {
  AUTH_POST_LOGIN_TARGET_KEY,

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  },

  async signInWithOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  },

  async finalizePostLogin(): Promise<void> {
    await this.ensureDisplayName();
  },

  async getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const displayName =
      user.user_metadata.display_name ||
      user.user_metadata.full_name ||
      user.user_metadata.name ||
      (user.email ? user.email.split("@")[0] : undefined);

    const mapProvider = (provider?: string): AuthProvider => {
      if (provider === "email") return "email";
      if (provider === "google") return "google";
      return "unknown";
    };

    return {
      id: user.id,
      email: user.email,
      displayName,
      avatarUrl: user.user_metadata.avatar_url || user.user_metadata.picture,
      provider: mapProvider(user.app_metadata.provider),
    };
  },

  savePostLoginTarget(path: string) {
    if (isInvitePath(path)) {
      localStorage.setItem(AUTH_POST_LOGIN_TARGET_KEY, path);
    }
  },

  getPostLoginTarget() {
    const target = localStorage.getItem(AUTH_POST_LOGIN_TARGET_KEY);
    if (!target) return null;
    return isInvitePath(target) ? target : null;
  },

  consumePostLoginTarget() {
    const target = this.getPostLoginTarget();
    localStorage.removeItem(AUTH_POST_LOGIN_TARGET_KEY);
    return target;
  },

  async ensureDisplayName() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const meta = user.user_metadata;
    if (!meta.display_name && !meta.full_name && !meta.name && user.email) {
      const displayName = user.email.split("@")[0];
      await supabase.auth.updateUser({
        data: { display_name: displayName },
      });
    }
  },
};
