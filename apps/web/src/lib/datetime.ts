export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCivilDate(value: string): boolean {
  const match = CIVIL_DATE.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function addCivilDays(date: string, days: number): string {
  const match = CIVIL_DATE.exec(date);

  if (!match) {
    throw new Error(`Invalid civil date: ${date}`);
  }

  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return utc.toISOString().slice(0, 10);
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

export function civilDateInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export function todayCivil(timeZone = browserTimeZone()): string {
  return civilDateInTimeZone(new Date(), timeZone);
}

export function startOfWeekMonday(date: string): string {
  const match = CIVIL_DATE.exec(date);

  if (!match) {
    throw new Error(`Invalid civil date: ${date}`);
  }

  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addCivilDays(date, delta);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function monthEnd(date: string): string {
  const start = monthStart(date);
  const match = CIVIL_DATE.exec(start);

  if (!match) {
    throw new Error(`Invalid civil date: ${date}`);
  }

  const nextMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0));
  return nextMonth.toISOString().slice(0, 10);
}

export type MonthCell = {
  date: string;
  inMonth: boolean;
};

export function monthGrid(date: string): MonthCell[] {
  const start = monthStart(date);
  const end = monthEnd(date);
  const gridStart = startOfWeekMonday(start);
  const lastWeekStart = startOfWeekMonday(end);
  const gridEnd = addCivilDays(lastWeekStart, 6);
  const cells: MonthCell[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    cells.push({
      date: cursor,
      inMonth: cursor >= start && cursor <= end,
    });
    cursor = addCivilDays(cursor, 1);
  }

  return cells;
}

export function weekDates(date: string): string[] {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, index) => addCivilDays(start, index));
}

export function formatCivilDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export function formatMonthTitle(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const label = new Date(Date.UTC(year, (month ?? 1) - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekdayLabel(date: string, style: "short" | "long" = "short"): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).toLocaleDateString("pt-BR", {
    weekday: style,
    timeZone: "UTC",
  });
}

export function toOffsetIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  const offsetHour = pad(Math.floor(absolute / 60));
  const offsetMinute = pad(absolute % 60);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`;
}

export function formatDateTime(iso: string, timeZone = browserTimeZone()): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function localTimeFromIso(iso: string, timeZone = browserTimeZone()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  return `${part(parts, "hour")}:${part(parts, "minute")}`;
}
