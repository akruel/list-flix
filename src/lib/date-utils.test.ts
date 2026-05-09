import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateLong,
  getCountdownText,
  getDateKey,
  getDayLabel,
  getFormattedDate,
  isDateInCurrentWeek,
  parseLocalDate,
} from "./date-utils";

describe("parseLocalDate", () => {
  it("parses a date string as local midnight", () => {
    const date = parseLocalDate("2025-05-10");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(4); // 0-indexed
    expect(date.getDate()).toBe(10);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });
});

describe("formatDate", () => {
  it("formats a date string for pt-BR locale", () => {
    const result = formatDate("2025-05-10");
    expect(result).toBe("10/05/2025");
  });

  it("returns TBA for empty string", () => {
    expect(formatDate("")).toBe("TBA");
  });
});

describe("formatDateLong", () => {
  it("formats a date string with weekday and month name", () => {
    const result = formatDateLong("2025-05-10");
    expect(result).toContain("sábado");
    expect(result).toContain("10");
    expect(result).toContain("maio");
    expect(result).toContain("2025");
  });

  it("returns TBA for empty string", () => {
    expect(formatDateLong("")).toBe("TBA");
  });
});

describe("getCountdownText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Estreia hoje for today", () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(getCountdownText(dateStr)).toBe("Estreia hoje!");
  });

  it("returns Estreia amanhã for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    expect(getCountdownText(dateStr)).toBe("Estreia amanhã!");
  });

  it("returns Faltam X dias for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
    expect(getCountdownText(dateStr)).toBe("Faltam 5 dias");
  });

  it("returns Já disponível for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const dateStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
    expect(getCountdownText(dateStr)).toBe("Já disponível");
  });
});

describe("isDateInCurrentWeek", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for a date within this week", () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(isDateInCurrentWeek(dateStr)).toBe(true);
  });

  it("returns false for a date far in the future", () => {
    expect(isDateInCurrentWeek("2099-12-25")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isDateInCurrentWeek("")).toBe(false);
  });

  it("works correctly when current day is Sunday", () => {
    const sunday = new Date(2025, 4, 11);
    vi.setSystemTime(sunday);

    expect(isDateInCurrentWeek("2025-05-11")).toBe(true);
    expect(isDateInCurrentWeek("2025-05-10")).toBe(true);
    expect(isDateInCurrentWeek("2025-05-12")).toBe(false);
  });
});

describe("getDayLabel", () => {
  it("returns the weekday name in pt-BR", () => {
    const result = getDayLabel("2025-05-10");
    expect(result).toBe("sábado");
  });
});

describe("getFormattedDate", () => {
  it("returns day and month name", () => {
    const result = getFormattedDate("2025-05-10");
    expect(result).toBe("10 de maio");
  });
});

describe("getDateKey", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = getDateKey("2025-05-10");
    expect(result).toBe("2025-05-10");
  });
});
