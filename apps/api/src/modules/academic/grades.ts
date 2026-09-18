export const CP_WEIGHT = 0.4;
export const GS_WEIGHT = 0.6;
export const SEMESTER_1_WEIGHT = 0.4;
export const SEMESTER_2_WEIGHT = 0.6;
export const DIRECT_PASS_AVERAGE = 60;
export const EXAM_MIN_AVERAGE = 40;
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export type AssessmentKind = "CP" | "GS";
export type AcademicSemester = 1 | 2;
export type AcademicStatus =
  | "EM_ANDAMENTO"
  | "APROVADO_DIRETO"
  | "EXAME"
  | "REPROVADO_DIRETO";

export type GradeSlot = {
  semester: AcademicSemester;
  kind: AssessmentKind;
  score: number | null;
};

export type AnnualResult = {
  md1: number | null;
  md2: number | null;
  mp: number | null;
  status: AcademicStatus;
};

export type AttendanceInput = {
  totalClasses: number;
  absences: number;
};

export type AttendanceResult = {
  totalClasses: number;
  absences: number;
  percentage: number | null;
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

export function isValidScore(score: number): boolean {
  return Number.isFinite(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}

function semesterAverage(cp: number | null, gs: number | null): number | null {
  if (cp === null || gs === null) {
    return null;
  }

  return cp * CP_WEIGHT + gs * GS_WEIGHT;
}

function classifyAnnual(mp: number): AcademicStatus {
  if (mp >= DIRECT_PASS_AVERAGE) {
    return "APROVADO_DIRETO";
  }

  if (mp >= EXAM_MIN_AVERAGE) {
    return "EXAME";
  }

  return "REPROVADO_DIRETO";
}

function scoreOf(
  slots: GradeSlot[],
  semester: AcademicSemester,
  kind: AssessmentKind,
): number | null {
  const match = slots.find((slot) => slot.semester === semester && slot.kind === kind);
  return match?.score ?? null;
}

export function computeAnnualResult(slots: GradeSlot[]): AnnualResult {
  const cp1 = scoreOf(slots, 1, "CP");
  const gs1 = scoreOf(slots, 1, "GS");
  const cp2 = scoreOf(slots, 2, "CP");
  const gs2 = scoreOf(slots, 2, "GS");
  const md1 = semesterAverage(cp1, gs1);
  const md2 = semesterAverage(cp2, gs2);

  if (cp1 === null || gs1 === null || cp2 === null || gs2 === null || md1 === null || md2 === null) {
    return {
      md1,
      md2,
      mp: null,
      status: "EM_ANDAMENTO",
    };
  }

  const mp = md1 * SEMESTER_1_WEIGHT + md2 * SEMESTER_2_WEIGHT;

  return {
    md1,
    md2,
    mp,
    status: classifyAnnual(mp),
  };
}

export function computeAttendance(input: AttendanceInput): AttendanceResult {
  const { totalClasses, absences } = input;

  return {
    totalClasses,
    absences,
    percentage: totalClasses === 0 ? null : ((totalClasses - absences) / totalClasses) * 100,
  };
}

export function assertAttendance(input: AttendanceInput): void {
  if (!Number.isInteger(input.totalClasses) || input.totalClasses < 0) {
    throw new Error("Invalid total classes");
  }

  if (!Number.isInteger(input.absences) || input.absences < 0) {
    throw new Error("Invalid absences");
  }

  if (input.absences > input.totalClasses) {
    throw new Error("Absences cannot exceed total classes");
  }
}
