// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupLegacyStorage } from "./migrate";

const CLEANUP_FLAG = "listflix-legacy-storage-cleaned-v1";
const LEGACY_KEYS = [
  "listflix-storage",
  "listflix-user-content",
  "listflix-lists",
  "listflix-taste",
] as const;

const loggerErrorMock = vi.fn();
vi.mock("../lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("cleanupLegacyStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    loggerErrorMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("removes every legacy key and sets the cleanup flag on first run", () => {
    for (const key of LEGACY_KEYS) {
      localStorage.setItem(key, JSON.stringify({ state: { foo: "bar" } }));
    }

    cleanupLegacyStorage();

    for (const key of LEGACY_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem(CLEANUP_FLAG)).toBe("1");
  });

  it("no-ops when the cleanup flag is already set", () => {
    localStorage.setItem(CLEANUP_FLAG, "1");
    localStorage.setItem("listflix-storage", "kept");

    cleanupLegacyStorage();

    expect(localStorage.getItem("listflix-storage")).toBe("kept");
  });

  it("logs and swallows errors when storage access fails", () => {
    const removeItemSpy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementationOnce(() => {
        throw new Error("storage offline");
      });

    cleanupLegacyStorage();

    expect(loggerErrorMock).toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });
});
