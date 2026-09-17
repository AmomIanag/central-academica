import { describe, expect, it } from "vitest";
import { formatAverage, formatDate, formatWeight, statusLabel } from "./format";

describe("formatAverage", () => {
  it("formats numbers with two decimal places in pt-BR", () => {
    expect(formatAverage(8.45)).toBe("8,45");
    expect(formatAverage(null)).toBe("—");
  });
});

describe("formatWeight", () => {
  it("renders weights as percentages", () => {
    expect(formatWeight(0.2)).toBe("20%");
    expect(formatWeight(0.5)).toBe("50%");
  });
});

describe("formatDate", () => {
  it("formats ISO calendar dates as dd/mm/yyyy", () => {
    expect(formatDate("2026-05-12")).toBe("12/05/2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("statusLabel", () => {
  it("maps academic status codes to Portuguese labels", () => {
    expect(statusLabel("aprovado")).toBe("Aprovado");
    expect(statusLabel("reprovado")).toBe("Reprovado");
    expect(statusLabel("em_andamento")).toBe("Em andamento");
  });
});
