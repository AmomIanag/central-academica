import { describe, expect, it } from "vitest";
import { computeDisciplineProgress, roundAverage } from "./grades";

describe("computeDisciplineProgress", () => {
  it("returns null average and em_andamento when there are no assessments", () => {
    expect(computeDisciplineProgress([])).toEqual({
      average: null,
      status: "em_andamento",
    });
  });

  it("returns null average and em_andamento when no scores are posted", () => {
    expect(
      computeDisciplineProgress([
        { weight: 0.2, score: null },
        { weight: 0.8, score: null },
      ]),
    ).toEqual({
      average: null,
      status: "em_andamento",
    });
  });

  it("uses a partial weighted average while scores are missing", () => {
    const result = computeDisciplineProgress([
      { weight: 0.2, score: 8 },
      { weight: 0.3, score: 7.5 },
      { weight: 0.5, score: null },
    ]);

    expect(result.status).toBe("em_andamento");
    expect(result.average).toBeCloseTo(7.7, 10);
  });

  it("marks as aprovado when every score is posted and the average meets the cutoff", () => {
    const result = computeDisciplineProgress([
      { weight: 0.2, score: 9 },
      { weight: 0.3, score: 8 },
      { weight: 0.5, score: 8.5 },
    ]);

    expect(result.status).toBe("aprovado");
    expect(result.average).toBeCloseTo(8.45, 10);
    expect(roundAverage(result.average)).toBe(8.45);
  });

  it("marks as reprovado when every score is posted and the average is below the cutoff", () => {
    const result = computeDisciplineProgress([
      { weight: 0.2, score: 4 },
      { weight: 0.3, score: 5 },
      { weight: 0.5, score: 5.5 },
    ]);

    expect(result.status).toBe("reprovado");
    expect(result.average).toBeCloseTo(5.05, 10);
  });

  it("weights assessments unequally", () => {
    const result = computeDisciplineProgress([
      { weight: 0.1, score: 10 },
      { weight: 0.9, score: 0 },
    ]);

    expect(result.status).toBe("reprovado");
    expect(result.average).toBeCloseTo(1, 10);
  });
});
