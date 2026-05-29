import {
  consumePostLoginTarget,
  getPostLoginTarget,
  savePostLoginTarget,
} from "@/lib/auth-post-login";

import { supabase } from "../lib/supabase";
import type { AuthProvider, UserProfile } from "../types";

export const authService = {
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
    savePostLoginTarget(path);
  },

  getPostLoginTarget() {
    return getPostLoginTarget();
  },

  consumePostLoginTarget() {
    return consumePostLoginTarget();
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
