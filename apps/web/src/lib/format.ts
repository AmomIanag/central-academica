import type { AcademicStatus } from "./types";

export function formatAverage(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

export function formatScore(value: number | null): string {
  return formatAverage(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${formatAverage(value)}%`;
}

export function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) {
    return iso;
  }

  return `${day}/${month}/${year}`;
}

export function statusLabel(status: AcademicStatus): string {
  switch (status) {
    case "APROVADO_DIRETO":
      return "Aprovado direto";
    case "REPROVADO_DIRETO":
      return "Reprovado direto";
    case "EXAME":
      return "Exame";
    default:
      return "Em andamento";
  }
}
