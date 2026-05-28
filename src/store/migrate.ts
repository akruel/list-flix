import { logger } from "../lib/logger";

const LEGACY_KEY = "listflix-storage";
const MIGRATION_FLAG = "listflix-store-split-migrated-v1";

const NEW_KEYS = {
  userContent: "listflix-user-content",
  lists: "listflix-lists",
  taste: "listflix-taste",
} as const;

function migrateOnce() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }

    const parsed = JSON.parse(raw) as {
      state?: Record<string, unknown>;
    } | null;
    const state = parsed?.state ?? null;
    if (!state) {
      localStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }

    if (!localStorage.getItem(NEW_KEYS.userContent)) {
      localStorage.setItem(
        NEW_KEYS.userContent,
        JSON.stringify({
          state: {
            myList: state.myList ?? [],
            watchedIds: state.watchedIds ?? [],
            watchedEpisodes: state.watchedEpisodes ?? {},
            seriesMetadata: state.seriesMetadata ?? {},
          },
          version: 0,
        }),
      );
    }

    if (!localStorage.getItem(NEW_KEYS.lists)) {
      localStorage.setItem(
        NEW_KEYS.lists,
        JSON.stringify({
          state: {
            lists: state.lists ?? [],
          },
          version: 0,
        }),
      );
    }

    if (!localStorage.getItem(NEW_KEYS.taste)) {
      localStorage.setItem(
        NEW_KEYS.taste,
        JSON.stringify({
          state: {
            tasteSuggestions: state.tasteSuggestions ?? null,
            tasteSuggestionsTimestamp: state.tasteSuggestionsTimestamp ?? null,
            tasteSuggestionsScope: state.tasteSuggestionsScope ?? null,
          },
          version: 0,
        }),
      );
    }

    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch (err) {
    logger.error("Failed to migrate listflix-storage:", err);
  }
}

migrateOnce();

export { NEW_KEYS };
