import type { AuthProvider, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { migrationService } from './migrationService';
import { userContentService } from './userContent';

const MIGRATION_OLD_USER_ID_KEY = 'migration_old_user_id';
const AUTH_POST_LOGIN_TARGET_KEY = 'auth_post_login_target';

interface FinalizePostLoginResult {
  userId: string | null;
  isAnonymous: boolean;
  migrationConflict: boolean;
}

const mapProvider = (provider?: string, isAnonymous?: boolean): AuthProvider => {
  if (isAnonymous) return 'anonymous';
  if (provider === 'email') return 'email';
  if (provider === 'google') return 'google';
  return 'unknown';
};

const normalizePathname = (path: string): string => {
  const [pathname] = path.split('?');
  return pathname;
};

const isInvitePath = (path: string): boolean => {
  return /^\/lists\/[^/]+\/join$/.test(normalizePathname(path));
};

export const authService = {
  MIGRATION_OLD_USER_ID_KEY,
  AUTH_POST_LOGIN_TARGET_KEY,

  async signInWithGoogle() {
    await this.storeMigrationSourceIfAnonymous();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  },

  async signInWithOtp(email: string) {
    await this.storeMigrationSourceIfAnonymous();

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

  async signInAnonymously() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.is_anonymous) {
      return currentUser.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw error;
    }

    return data.user?.id ?? null;
  },

  async signOutFully() {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem(MIGRATION_OLD_USER_ID_KEY);

    if (error) {
      throw error;
    }
  },

  async signOutToGuest() {
    await this.signOutFully();
    await this.signInAnonymously();
  },

  async finalizePostLogin(): Promise<FinalizePostLoginResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        userId: null,
        isAnonymous: false,
        migrationConflict: false,
      };
    }

    const user = session.user;
    const isAnonymous = user.is_anonymous ?? false;
    let migrationConflict = false;

    if (!isAnonymous) {
      const oldUserId = localStorage.getItem(MIGRATION_OLD_USER_ID_KEY);

      if (oldUserId && oldUserId !== user.id) {
        try {
          const hasRemoteData = await userContentService.hasData(user.id);

          if (hasRemoteData) {
            migrationConflict = true;
          } else {
            await this.migrateAnonymousData(oldUserId, user.id);
            localStorage.removeItem(MIGRATION_OLD_USER_ID_KEY);
          }
        } catch (error) {
          console.error('Migration failed during finalizePostLogin:', error);
          migrationConflict = true;
        }
      }

      await this.ensureDisplayName();
    }

    return {
      userId: user.id,
      isAnonymous,
      migrationConflict,
    };
  },

  async getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  },

  async isAnonymous() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.is_anonymous ?? false;
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const displayName =
      user.user_metadata.display_name ||
      user.user_metadata.full_name ||
      user.user_metadata.name ||
      (user.email ? user.email.split('@')[0] : undefined);

    return {
      id: user.id,
      email: user.email,
      displayName,
      avatarUrl: user.user_metadata.avatar_url || user.user_metadata.picture,
      provider: mapProvider(user.app_metadata.provider, user.is_anonymous),
      isAnonymous: user.is_anonymous ?? false,
    };
  },

  async migrateAnonymousData(oldUserId: string, newUserId: string) {
    return migrationService.migrateAnonymousUserData(oldUserId, newUserId);
  },

  savePostLoginTarget(path: string) {
    if (isInvitePath(path)) {
      localStorage.setItem(AUTH_POST_LOGIN_TARGET_KEY, path);
    }
  },

  consumePostLoginTarget() {
    const target = localStorage.getItem(AUTH_POST_LOGIN_TARGET_KEY);
    localStorage.removeItem(AUTH_POST_LOGIN_TARGET_KEY);

    if (!target) return null;
    return isInvitePath(target) ? target : null;
  },

  getPostLoginTarget() {
    const target = localStorage.getItem(AUTH_POST_LOGIN_TARGET_KEY);
    if (!target) return null;
    return isInvitePath(target) ? target : null;
  },

  clearMigrationOldUserId() {
    localStorage.removeItem(MIGRATION_OLD_USER_ID_KEY);
  },

  async storeMigrationSourceIfAnonymous() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.is_anonymous) {
      localStorage.setItem(MIGRATION_OLD_USER_ID_KEY, user.id);
    }
  },

  async ensureDisplayName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) return;

    const meta = user.user_metadata;
    if (!meta.display_name && !meta.full_name && !meta.name && user.email) {
      const displayName = user.email.split('@')[0];
      await supabase.auth.updateUser({
        data: { display_name: displayName },
      });
    }
  },
};
