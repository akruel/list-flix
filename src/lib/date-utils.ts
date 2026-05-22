export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateString: string, locale = "pt-BR"): string {
  if (!dateString) return "TBA";
  return parseLocalDate(dateString).toLocaleDateString(locale);
}

export function formatDateLong(dateString: string, locale = "pt-BR"): string {
  if (!dateString) return "TBA";
  return parseLocalDate(dateString).toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getCountdownText(airDate: string): string {
  const air = parseLocalDate(airDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = air.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Estreia hoje!";
  if (diffDays === 1) return "Estreia amanhã!";
  if (diffDays > 0) return `Faltam ${diffDays} dias`;
  return "Já disponível";
}

function getWeekDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = -((dayOfWeek + 6) % 7);

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isDateInCurrentWeek(dateString: string): boolean {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  const { start, end } = getWeekDateRange();
  return date >= start && date <= end;
}

export function getDayLabel(dateString: string, locale = "pt-BR"): string {
  return parseLocalDate(dateString).toLocaleDateString(locale, {
    weekday: "long",
  });
}

export function getFormattedDate(dateString: string, locale = "pt-BR"): string {
  return parseLocalDate(dateString).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });
}

export function getDateKey(dateString: string): string {
  const d = parseLocalDate(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns a relative time string in pt-BR for activity feed timestamps.
 * e.g. "há 2h", "há 5min", "há 3 dias"
 */
export function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

/**
 * Returns a day section label in pt-BR for activity feed grouping headers.
 * e.g. "Hoje", "Ontem", "20 de maio"
 */
export function getDayGroupLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (dateKey === todayKey) return "Hoje";
  if (dateKey === yesterdayKey) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

/**
 * Returns a YYYY-MM-DD day key from an ISO timestamp (uses local date).
 */
export function getDayKeyFromIso(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
