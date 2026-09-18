import { describe, expect, it } from "vitest";
import {
  computeAnnualResult,
  computeAttendance,
  isValidScore,
  roundAverage,
} from "./grades";

describe("computeAnnualResult", () => {
  it("computes the official annual formula and classifies as APROVADO_DIRETO", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 60 },
      { semester: 1, kind: "GS", score: 80 },
      { semester: 2, kind: "CP", score: 70 },
      { semester: 2, kind: "GS", score: 100 },
    ]);

    expect(result.md1).toBe(72);
    expect(result.md2).toBe(88);
    expect(result.mp).toBe(81.6);
    expect(result.status).toBe("APROVADO_DIRETO");
    expect(roundAverage(result.mp)).toBe(81.6);
  });

  it("classifies MP 60 as APROVADO_DIRETO", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 60 },
      { semester: 1, kind: "GS", score: 60 },
      { semester: 2, kind: "CP", score: 60 },
      { semester: 2, kind: "GS", score: 60 },
    ]);

    expect(result.mp).toBe(60);
    expect(result.status).toBe("APROVADO_DIRETO");
  });

  it("classifies MP 59.9 as EXAME", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 59.9 },
      { semester: 1, kind: "GS", score: 59.9 },
      { semester: 2, kind: "CP", score: 59.9 },
      { semester: 2, kind: "GS", score: 59.9 },
    ]);

    expect(result.mp).toBeCloseTo(59.9, 10);
    expect(result.status).toBe("EXAME");
  });

  it("classifies MP 40 as EXAME", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 40 },
      { semester: 1, kind: "GS", score: 40 },
      { semester: 2, kind: "CP", score: 40 },
      { semester: 2, kind: "GS", score: 40 },
    ]);

    expect(result.mp).toBe(40);
    expect(result.status).toBe("EXAME");
  });

  it("classifies MP 39.9 as REPROVADO_DIRETO", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 39.9 },
      { semester: 1, kind: "GS", score: 39.9 },
      { semester: 2, kind: "CP", score: 39.9 },
      { semester: 2, kind: "GS", score: 39.9 },
    ]);

    expect(result.mp).toBeCloseTo(39.9, 10);
    expect(result.status).toBe("REPROVADO_DIRETO");
  });

  it("keeps EM_ANDAMENTO when any required score is missing", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 60 },
      { semester: 1, kind: "GS", score: 80 },
      { semester: 2, kind: "CP", score: 70 },
      { semester: 2, kind: "GS", score: null },
    ]);

    expect(result.md1).toBe(72);
    expect(result.md2).toBeNull();
    expect(result.mp).toBeNull();
    expect(result.status).toBe("EM_ANDAMENTO");
  });

  it("treats a previously posted score that was removed as absence, not zero", () => {
    const withScore = computeAnnualResult([
      { semester: 1, kind: "CP", score: 60 },
      { semester: 1, kind: "GS", score: 80 },
      { semester: 2, kind: "CP", score: 70 },
      { semester: 2, kind: "GS", score: 100 },
    ]);
    const afterRemoval = computeAnnualResult([
      { semester: 1, kind: "CP", score: null },
      { semester: 1, kind: "GS", score: 80 },
      { semester: 2, kind: "CP", score: 70 },
      { semester: 2, kind: "GS", score: 100 },
    ]);

    expect(withScore.status).toBe("APROVADO_DIRETO");
    expect(afterRemoval.md1).toBeNull();
    expect(afterRemoval.mp).toBeNull();
    expect(afterRemoval.status).toBe("EM_ANDAMENTO");
  });

  it("does not round MD1 or MD2 before computing MP", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 61 },
      { semester: 1, kind: "GS", score: 82 },
      { semester: 2, kind: "CP", score: 73 },
      { semester: 2, kind: "GS", score: 97 },
    ]);

    const md1 = 61 * 0.4 + 82 * 0.6;
    const md2 = 73 * 0.4 + 97 * 0.6;

    expect(result.md1).toBe(md1);
    expect(result.md2).toBe(md2);
    expect(result.mp).toBe(md1 * 0.4 + md2 * 0.6);
  });

  it("accepts 0 and 100 as valid posted scores", () => {
    const result = computeAnnualResult([
      { semester: 1, kind: "CP", score: 0 },
      { semester: 1, kind: "GS", score: 100 },
      { semester: 2, kind: "CP", score: 100 },
      { semester: 2, kind: "GS", score: 0 },
    ]);

    expect(result.md1).toBe(60);
    expect(result.md2).toBe(40);
    expect(result.mp).toBe(48);
    expect(result.status).toBe("EXAME");
  });
});

describe("isValidScore", () => {
  it("accepts the inclusive 0–100 scale", () => {
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(100)).toBe(true);
    expect(isValidScore(59.9)).toBe(true);
  });

  it("rejects scores outside the scale", () => {
    expect(isValidScore(-0.01)).toBe(false);
    expect(isValidScore(100.01)).toBe(false);
    expect(isValidScore(Number.NaN)).toBe(false);
  });
});

describe("computeAttendance", () => {
  it("derives 85% from 40 classes and 6 absences", () => {
    expect(computeAttendance({ totalClasses: 40, absences: 6 })).toEqual({
      totalClasses: 40,
      absences: 6,
      percentage: 85,
    });
  });

  it("derives 100% when there are classes and no absences", () => {
    expect(computeAttendance({ totalClasses: 10, absences: 0 }).percentage).toBe(100);
  });

  it("derives 0% when every class was missed", () => {
    expect(computeAttendance({ totalClasses: 10, absences: 10 }).percentage).toBe(0);
  });

  it("returns an unavailable percentage when there are no classes", () => {
    expect(computeAttendance({ totalClasses: 0, absences: 0 }).percentage).toBeNull();
  });
});
