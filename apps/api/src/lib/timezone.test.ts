import { describe, expect, it } from "vitest";
import {
  addCivilDays,
  civilDateInTimeZone,
  isCivilDate,
  isValidTimeZone,
  localDateTimeToUtc,
  rangeToUtcBounds,
} from "./timezone";

describe("civil dates", () => {
  it("accepts real calendar dates and rejects impossible ones", () => {
    expect(isCivilDate("2026-09-20")).toBe(true);
    expect(isCivilDate("2026-02-28")).toBe(true);
    expect(isCivilDate("2026-02-29")).toBe(false);
    expect(isCivilDate("2026-09-31")).toBe(false);
    expect(isCivilDate("20/09/2026")).toBe(false);
  });

  it("adds days in civil space without UTC midnight conversion", () => {
    expect(addCivilDays("2026-09-20", 1)).toBe("2026-09-21");
    expect(addCivilDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("time zones", () => {
  it("validates IANA names", () => {
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
  });

  it("converts Sao Paulo local midnight and evening to UTC instants", () => {
    expect(localDateTimeToUtc("2026-09-20", "00:00:00", "America/Sao_Paulo").toISOString()).toBe(
      "2026-09-20T03:00:00.000Z",
    );
    expect(localDateTimeToUtc("2026-09-20", "18:30:00", "America/Sao_Paulo").toISOString()).toBe(
      "2026-09-20T21:30:00.000Z",
    );
  });

  it("accounts for DST when converting America/New_York midnights", () => {
    expect(localDateTimeToUtc("2026-01-15", "00:00:00", "America/New_York").toISOString()).toBe(
      "2026-01-15T05:00:00.000Z",
    );
    expect(localDateTimeToUtc("2026-07-15", "00:00:00", "America/New_York").toISOString()).toBe(
      "2026-07-15T04:00:00.000Z",
    );
  });

  it("builds a half-open UTC range for a local civil day", () => {
    const range = rangeToUtcBounds("2026-09-20", "2026-09-20", "America/Sao_Paulo");

    expect(range.start?.toISOString()).toBe("2026-09-20T03:00:00.000Z");
    expect(range.end?.toISOString()).toBe("2026-09-21T03:00:00.000Z");
  });

  it("reads the civil date of an instant in a time zone", () => {
    expect(civilDateInTimeZone(new Date("2026-09-21T02:30:00.000Z"), "America/Sao_Paulo")).toBe(
      "2026-09-20",
    );
    expect(civilDateInTimeZone(new Date("2026-09-21T03:00:00.000Z"), "America/Sao_Paulo")).toBe(
      "2026-09-21",
    );
  });
});
