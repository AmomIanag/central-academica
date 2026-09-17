export const PASSING_AVERAGE = 6.0;

export type AcademicStatus = "em_andamento" | "aprovado" | "reprovado";

export type GradedAssessment = {
  weight: number;
  score: number | null;
};

export type DisciplineProgress = {
  average: number | null;
  status: AcademicStatus;
};

export function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid numeric value");
  }

  return parsed;
}

export function toNullableNumber(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  return toNumber(value);
}

export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundAverage(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return roundToTwo(value);
}

export function computeDisciplineProgress(assessments: GradedAssessment[]): DisciplineProgress {
  if (assessments.length === 0) {
    return { average: null, status: "em_andamento" };
  }

  const graded = assessments.filter(
    (assessment): assessment is { weight: number; score: number } => assessment.score !== null,
  );

  if (graded.length === 0) {
    return { average: null, status: "em_andamento" };
  }

  const weightSum = graded.reduce((total, assessment) => total + assessment.weight, 0);
  const average =
    weightSum === 0
      ? null
      : graded.reduce((total, assessment) => total + assessment.score * assessment.weight, 0) / weightSum;

  if (graded.length < assessments.length) {
    return { average, status: "em_andamento" };
  }

  if (average === null) {
    return { average: null, status: "em_andamento" };
  }

  return {
    average,
    status: average >= PASSING_AVERAGE ? "aprovado" : "reprovado",
  };
}
