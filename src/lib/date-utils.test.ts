import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateLong,
  getCountdownText,
  getDateKey,
  getDayGroupLabel,
  getDayKeyFromIso,
  getDayLabel,
  getFormattedDate,
  getRelativeTime,
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
});

describe("formatDateLong", () => {
  it("formats a date string with weekday and month name", () => {
    const result = formatDateLong("2025-05-10");
    expect(result).toContain("sábado");
    expect(result).toContain("10");
    expect(result).toContain("maio");
    expect(result).toContain("2025");
  });
});

describe("TBA fallback for empty input", () => {
  it.each([
    { name: "formatDate", fn: formatDate },
    { name: "formatDateLong", fn: formatDateLong },
  ])("$name returns TBA for empty string", ({ fn }) => {
    expect(fn("")).toBe("TBA");
  });
});

describe("getCountdownText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function buildDateStringFromOffset(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  it.each([
    { caseName: "today", daysOffset: 0, expected: "Estreia hoje!" },
    { caseName: "tomorrow", daysOffset: 1, expected: "Estreia amanhã!" },
    { caseName: "future (5 days)", daysOffset: 5, expected: "Faltam 5 dias" },
    { caseName: "past (-3 days)", daysOffset: -3, expected: "Já disponível" },
  ])("returns $expected for $caseName", ({ daysOffset, expected }) => {
    expect(getCountdownText(buildDateStringFromOffset(daysOffset))).toBe(
      expected,
    );
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
    vi.setSystemTime(1746792000000);

    const dateStr = "2025-05-09";
    expect(isDateInCurrentWeek(dateStr)).toBe(true);
  });

  it("returns false for a date far in the future", () => {
    expect(isDateInCurrentWeek("2099-12-25")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isDateInCurrentWeek("")).toBe(false);
  });

  it("works correctly when current day is Sunday", () => {
    vi.setSystemTime(1746964800000);

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

describe("getRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    {
      caseName: "less than 1 minute ago",
      now: "2026-05-22T10:00:30Z",
      input: "2026-05-22T10:00:00Z",
      expected: "agora" as const,
    },
    {
      caseName: "within the last hour",
      now: "2026-05-22T10:15:00Z",
      input: "2026-05-22T10:00:00Z",
      expected: "há 15min" as const,
    },
    {
      caseName: "within the last 24 hours",
      now: "2026-05-22T12:00:00Z",
      input: "2026-05-22T10:00:00Z",
      expected: "há 2h" as const,
    },
    {
      caseName: "exactly 1 day ago",
      now: "2026-05-22T10:00:00Z",
      input: "2026-05-21T10:00:00Z",
      expected: "ontem" as const,
    },
    {
      caseName: "2-6 days ago",
      now: "2026-05-22T10:00:00Z",
      input: "2026-05-19T10:00:00Z",
      expected: "há 3 dias" as const,
    },
  ])("returns $expected for $caseName", ({ now, input, expected }) => {
    vi.setSystemTime(new Date(now));
    expect(getRelativeTime(input)).toBe(expected);
  });

  it("returns a formatted date for timestamps older than 7 days", () => {
    vi.setSystemTime(new Date("2026-05-22T10:00:00Z"));
    const result = getRelativeTime("2026-05-01T10:00:00Z");
    expect(result).toMatch(/\d+ de mai/i);
  });
});

describe("getDayGroupLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    {
      caseName: "today",
      input: "2026-05-22T08:00:00Z",
      expected: "Hoje",
    },
    {
      caseName: "yesterday",
      input: "2026-05-21T20:00:00Z",
      expected: "Ontem",
    },
  ])("returns $expected for $caseName", ({ input, expected }) => {
    expect(getDayGroupLabel(input)).toBe(expected);
  });

  it("returns formatted date for older dates", () => {
    const result = getDayGroupLabel("2026-05-19T10:00:00Z");
    expect(result).toMatch(/\d+ de mai/i);
  });
});

describe("getDayKeyFromIso", () => {
  it("returns YYYY-MM-DD from an ISO timestamp", () => {
    expect(getDayKeyFromIso("2026-05-22T14:30:00Z")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("returns consistent key for same day regardless of time", () => {
    const t1 = new Date("2026-05-22T00:00:00");
    const t2 = new Date("2026-05-22T23:59:59");
    expect(getDayKeyFromIso(t1.toISOString())).toBe(
      getDayKeyFromIso(t2.toISOString()),
    );
  });
});
