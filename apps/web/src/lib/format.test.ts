import { describe, expect, it } from "vitest";
import { formatAverage, formatDate, formatPercent, formatWeight, statusLabel } from "./format";

describe("formatAverage", () => {
  it("formats numbers with up to two decimal places in pt-BR", () => {
    expect(formatAverage(81.6)).toBe("81,6");
    expect(formatAverage(72)).toBe("72");
    expect(formatAverage(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("appends a percent sign when a value exists", () => {
    expect(formatPercent(85)).toBe("85%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatWeight", () => {
  it("renders weights as percentages", () => {
    expect(formatWeight(0.4)).toBe("40%");
    expect(formatWeight(0.6)).toBe("60%");
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
    expect(statusLabel("APROVADO_DIRETO")).toBe("Aprovado direto");
    expect(statusLabel("REPROVADO_DIRETO")).toBe("Reprovado direto");
    expect(statusLabel("EXAME")).toBe("Exame");
    expect(statusLabel("EM_ANDAMENTO")).toBe("Em andamento");
  });
});
