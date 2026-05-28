import { logger } from "../lib/logger";

const CLEANUP_FLAG = "listflix-legacy-storage-cleaned-v1";

// Keys written by the previous Zustand-persisted architecture. User content now
// lives in React Query with Supabase as the source of truth, so these are
// removed once to avoid leaving stale data behind in returning users' browsers.
const LEGACY_KEYS = [
  "listflix-storage",
  "listflix-user-content",
  "listflix-lists",
  "listflix-taste",
] as const;

export function cleanupLegacyStorage(): void {
  try {
    if (localStorage.getItem(CLEANUP_FLAG)) return;

    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }

    localStorage.setItem(CLEANUP_FLAG, "1");
  } catch (err) {
    logger.error("Failed to clean up legacy storage keys:", err);
  }
}
