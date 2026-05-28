// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LEGACY_KEY = "listflix-storage";
const MIGRATION_FLAG = "listflix-store-split-migrated-v1";
const NEW_USER_CONTENT = "listflix-user-content";
const NEW_LISTS = "listflix-lists";
const NEW_TASTE = "listflix-taste";

const loggerErrorMock = vi.fn();
vi.mock("../lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

async function importMigrate() {
  vi.resetModules();
  return import("./migrate");
}

function readKey(key: string) {
  const value = localStorage.getItem(key);
  if (value === null) {
    throw new Error(`Expected localStorage key "${key}" to be set`);
  }
  return JSON.parse(value);
}

describe("migrate", () => {
  beforeEach(() => {
    localStorage.clear();
    loggerErrorMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("no-ops when migration flag is already set", async () => {
    localStorage.setItem(MIGRATION_FLAG, "1");
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ state: { myList: [{ id: 1 }] } }),
    );

    await importMigrate();

    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    expect(localStorage.getItem(NEW_USER_CONTENT)).toBeNull();
  });

  it("sets the flag when no legacy data is present", async () => {
    await importMigrate();

    expect(localStorage.getItem(MIGRATION_FLAG)).toBe("1");
    expect(localStorage.getItem(NEW_USER_CONTENT)).toBeNull();
  });

  it("sets the flag when legacy JSON has no state object", async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ version: 0 }));

    await importMigrate();

    expect(localStorage.getItem(MIGRATION_FLAG)).toBe("1");
    expect(localStorage.getItem(NEW_USER_CONTENT)).toBeNull();
  });

  it("splits legacy state into three persisted slices", async () => {
    const legacy = {
      state: {
        myList: [{ id: 1, media_type: "movie", title: "A" }],
        watchedIds: [42],
        watchedEpisodes: { 7: { 70: { season_number: 1, episode_number: 1 } } },
        seriesMetadata: { 7: { total_episodes: 12, number_of_seasons: 1 } },
        lists: [{ id: "list-1", name: "L", role: "owner" }],
        tasteSuggestions: [{ id: 9, media_type: "movie", title: "T" }],
        tasteSuggestionsTimestamp: 1234,
        tasteSuggestionsScope: "scope-x",
      },
    };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));

    await importMigrate();

    expect(readKey(NEW_USER_CONTENT).state.myList).toEqual(legacy.state.myList);
    expect(readKey(NEW_USER_CONTENT).state.watchedIds).toEqual([42]);

    expect(readKey(NEW_LISTS).state.lists).toEqual(legacy.state.lists);

    expect(readKey(NEW_TASTE).state.tasteSuggestions).toEqual(
      legacy.state.tasteSuggestions,
    );
    expect(readKey(NEW_TASTE).state.tasteSuggestionsScope).toBe("scope-x");

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(MIGRATION_FLAG)).toBe("1");
  });

  it("falls back to safe defaults when legacy fields are missing", async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ state: {} }));

    await importMigrate();

    expect(readKey(NEW_USER_CONTENT).state).toEqual({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    });

    expect(readKey(NEW_LISTS).state).toEqual({ lists: [] });

    expect(readKey(NEW_TASTE).state).toEqual({
      tasteSuggestions: null,
      tasteSuggestionsTimestamp: null,
      tasteSuggestionsScope: null,
    });
  });

  it("does not overwrite new keys that already exist", async () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ state: { myList: [{ id: 1 }] } }),
    );
    localStorage.setItem(
      NEW_USER_CONTENT,
      JSON.stringify({ state: { myList: "preserved" } }),
    );
    localStorage.setItem(
      NEW_LISTS,
      JSON.stringify({ state: { lists: "preserved" } }),
    );
    localStorage.setItem(
      NEW_TASTE,
      JSON.stringify({ state: { tasteSuggestions: "preserved" } }),
    );

    await importMigrate();

    expect(readKey(NEW_USER_CONTENT).state.myList).toBe("preserved");
    expect(readKey(NEW_LISTS).state.lists).toBe("preserved");
    expect(readKey(NEW_TASTE).state.tasteSuggestions).toBe("preserved");
  });

  it("logs and swallows errors when legacy JSON is malformed", async () => {
    localStorage.setItem(LEGACY_KEY, "not-json");

    await importMigrate();

    expect(loggerErrorMock).toHaveBeenCalledOnce();
    expect(localStorage.getItem(LEGACY_KEY)).toBe("not-json");
    expect(localStorage.getItem(MIGRATION_FLAG)).toBeNull();
  });
});
