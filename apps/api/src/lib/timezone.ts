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

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function addCivilDays(date: string, days: number): string {
  const match = CIVIL_DATE.exec(date);

  if (!match) {
    throw new Error(`Invalid civil date: ${date}`);
  }

  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return utc.toISOString().slice(0, 10);
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
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

function zonedParts(instant: Date, timeZone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
}

function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  let hour = Number(part(parts, "hour"));

  if (hour === 24) {
    hour = 0;
  }

  const asUtc = Date.UTC(
    Number(part(parts, "year")),
    Number(part(parts, "month")) - 1,
    Number(part(parts, "day")),
    hour,
    Number(part(parts, "minute")),
    Number(part(parts, "second")),
  );

  return asUtc - instant.getTime();
}

export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  if (!isCivilDate(date)) {
    throw new Error(`Invalid civil date: ${date}`);
  }

  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!timeMatch) {
    throw new Error(`Invalid time: ${time}`);
  }

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = offsetMsAt(new Date(utcGuess), timeZone);
  let instant = utcGuess - firstOffset;
  const secondOffset = offsetMsAt(new Date(instant), timeZone);

  if (secondOffset !== firstOffset) {
    instant = utcGuess - secondOffset;
  }

  return new Date(instant);
}

export function rangeToUtcBounds(
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { start: Date | null; end: Date | null } {
  return {
    start: from ? localDateTimeToUtc(from, "00:00:00", timeZone) : null,
    end: to ? localDateTimeToUtc(addCivilDays(to, 1), "00:00:00", timeZone) : null,
  };
}
