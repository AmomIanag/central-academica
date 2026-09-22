import { randomUUID } from "node:crypto";
import { conflict, notFound, validationError } from "../../http/app-error";
import { withTransaction } from "../../db/transaction";
import {
  CP_WEIGHT,
  GS_WEIGHT,
  computeAnnualResult,
  computeAttendance,
  roundAverage,
  type AcademicStatus,
  type GradeSlot,
} from "../academic/grades";
import type {
  CreateDisciplineInput,
  PatchAttendanceInput,
  PatchDisciplineInput,
  PatchGradeInput,
} from "./disciplines.schemas";
import {
  countEnrollments,
  countLinkedTasks,
  deleteDisciplineGraph,
  deleteGrade,
  findAssessmentSlot,
  findCurrentEnrollment,
  findCurrentTerm,
  findOwnedProfessorByName,
  insertAssessmentSlot,
  insertDiscipline,
  insertEnrollment,
  insertProfessor,
  listCurrentEnrollments,
  updateAttendance,
  updateDiscipline,
  upsertGrade,
  type DisciplineRecord,
  type Queryable,
} from "./disciplines.repository";

export type AttendanceView = {
  totalClasses: number;
  absences: number;
  percentage: number | null;
};

export type SemesterGradesView = {
  cp: number | null;
  gs: number | null;
  md: number | null;
};

export type DisciplineSummary = {
  id: string;
  code: string;
  name: string;
  academicYear: number;
  professor: {
    id: string;
    name: string;
  };
  attendance: AttendanceView;
  semester1: SemesterGradesView;
  semester2: SemesterGradesView;
  mp: number | null;
  status: AcademicStatus;
};

export type DisciplineDetail = DisciplineSummary & {
  term: {
    id: string;
    label: string;
  };
};

const ASSESSMENT_SLOTS = [
  { semester: 1, kind: "CP", weight: CP_WEIGHT, sortOrder: 1 },
  { semester: 1, kind: "GS", weight: GS_WEIGHT, sortOrder: 2 },
  { semester: 2, kind: "CP", weight: CP_WEIGHT, sortOrder: 3 },
  { semester: 2, kind: "GS", weight: GS_WEIGHT, sortOrder: 4 },
] as const;

const NO_CURRENT_TERM = "There is no current academic year.";
const DISCIPLINE_NOT_FOUND = "Discipline not found.";
const LINKED_TASKS_MESSAGE =
  "This discipline has linked tasks. Unlink or delete those tasks before removing the discipline.";

function slotsOf(discipline: DisciplineRecord): GradeSlot[] {
  return discipline.assessments.map((assessment) => ({
    semester: assessment.semester,
    kind: assessment.kind,
    score: assessment.score,
  }));
}

function scoreOf(discipline: DisciplineRecord, semester: 1 | 2, kind: "CP" | "GS"): number | null {
  return (
    discipline.assessments.find((assessment) => assessment.semester === semester && assessment.kind === kind)
      ?.score ?? null
  );
}

function toSummary(discipline: DisciplineRecord): DisciplineSummary {
  const result = computeAnnualResult(slotsOf(discipline));
  const attendance = computeAttendance({
    totalClasses: discipline.totalClasses,
    absences: discipline.absences,
  });

  return {
    id: discipline.id,
    code: discipline.code,
    name: discipline.name,
    academicYear: discipline.academicYear,
    professor: discipline.professor,
    attendance: {
      totalClasses: attendance.totalClasses,
      absences: attendance.absences,
      percentage: roundAverage(attendance.percentage),
    },
    semester1: {
      cp: roundAverage(scoreOf(discipline, 1, "CP")),
      gs: roundAverage(scoreOf(discipline, 1, "GS")),
      md: roundAverage(result.md1),
    },
    semester2: {
      cp: roundAverage(scoreOf(discipline, 2, "CP")),
      gs: roundAverage(scoreOf(discipline, 2, "GS")),
      md: roundAverage(result.md2),
    },
    mp: roundAverage(result.mp),
    status: result.status,
  };
}

function toDetail(discipline: DisciplineRecord): DisciplineDetail {
  return {
    ...toSummary(discipline),
    term: discipline.term,
  };
}

function generateCode(): string {
  return `D${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function assertWritable(userId: string, discipline: DisciplineRecord): void {
  if (discipline.ownerUserId !== userId) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }
}

async function loadWritable(userId: string, disciplineId: string): Promise<DisciplineRecord> {
  const discipline = await findCurrentEnrollment(userId, disciplineId);

  if (!discipline) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  assertWritable(userId, discipline);

  if ((await countEnrollments(discipline.id)) > 1) {
    throw conflict("This discipline is shared and cannot be edited personally.");
  }

  return discipline;
}

async function resolveProfessor(userId: string, professorName: string, db?: Queryable) {
  const existing = await findOwnedProfessorByName(userId, professorName, db);
  if (existing) {
    return existing;
  }

  return insertProfessor(professorName, db);
}

export function summarizeDisciplines(records: DisciplineRecord[]): DisciplineSummary[] {
  return records.map(toSummary);
}

export async function listDisciplines(userId: string): Promise<DisciplineSummary[]> {
  return summarizeDisciplines(await listCurrentEnrollments(userId));
}

export async function getDiscipline(userId: string, disciplineId: string): Promise<DisciplineDetail | null> {
  const discipline = await findCurrentEnrollment(userId, disciplineId);

  if (!discipline) {
    return null;
  }

  return toDetail(discipline);
}

export async function createDiscipline(
  userId: string,
  input: CreateDisciplineInput,
): Promise<DisciplineDetail> {
  const createdId = await withTransaction(async (client) => {
    const term = await findCurrentTerm(client);

    if (!term) {
      throw validationError(NO_CURRENT_TERM);
    }

    const professor = await resolveProfessor(userId, input.professorName, client);
    const disciplineId = randomUUID();

    await insertDiscipline(
      {
        id: disciplineId,
        termId: term.id,
        professorId: professor.id,
        code: generateCode(),
        name: input.name,
        ownerUserId: userId,
        academicYear: term.year,
      },
      client,
    );
    await insertEnrollment(
      {
        id: randomUUID(),
        userId,
        disciplineId,
      },
      client,
    );

    for (const slot of ASSESSMENT_SLOTS) {
      await insertAssessmentSlot(
        {
          id: randomUUID(),
          disciplineId,
          semester: slot.semester,
          kind: slot.kind,
          weight: slot.weight,
          sortOrder: slot.sortOrder,
        },
        client,
      );
    }

    return disciplineId;
  });

  const created = await getDiscipline(userId, createdId);

  if (!created) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  return created;
}

export async function patchDiscipline(
  userId: string,
  disciplineId: string,
  input: PatchDisciplineInput,
): Promise<DisciplineDetail> {
  await withTransaction(async (client) => {
    const discipline = await findCurrentEnrollment(userId, disciplineId, client);

    if (!discipline) {
      throw notFound(DISCIPLINE_NOT_FOUND);
    }

    assertWritable(userId, discipline);

    if ((await countEnrollments(discipline.id, client)) > 1) {
      throw conflict("This discipline is shared and cannot be edited personally.");
    }

    let professorId: string | undefined;

    if (input.professorName !== undefined) {
      const professor = await resolveProfessor(userId, input.professorName, client);
      professorId = professor.id;
    }

    await updateDiscipline(
      {
        id: discipline.id,
        name: input.name,
        professorId,
      },
      client,
    );
  });

  const updated = await getDiscipline(userId, disciplineId);

  if (!updated) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  return updated;
}

export async function patchDisciplineGrade(
  userId: string,
  disciplineId: string,
  input: PatchGradeInput,
): Promise<DisciplineDetail> {
  await withTransaction(async (client) => {
    const discipline = await findCurrentEnrollment(userId, disciplineId, client);

    if (!discipline) {
      throw notFound(DISCIPLINE_NOT_FOUND);
    }

    assertWritable(userId, discipline);

    if ((await countEnrollments(discipline.id, client)) > 1) {
      throw conflict("This discipline is shared and cannot be edited personally.");
    }

    const assessment = await findAssessmentSlot(discipline.id, input.semester, input.kind, client);

    if (!assessment) {
      throw notFound("Assessment slot not found.");
    }

    if (input.score === null) {
      await deleteGrade(discipline.enrollmentId, assessment.id, client);
      return;
    }

    await upsertGrade(
      {
        id: randomUUID(),
        enrollmentId: discipline.enrollmentId,
        assessmentId: assessment.id,
        score: input.score,
      },
      client,
    );
  });

  const updated = await getDiscipline(userId, disciplineId);

  if (!updated) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  return updated;
}

export async function patchDisciplineAttendance(
  userId: string,
  disciplineId: string,
  input: PatchAttendanceInput,
): Promise<DisciplineDetail> {
  const discipline = await loadWritable(userId, disciplineId);
  await updateAttendance(discipline.enrollmentId, input.totalClasses, input.absences);
  const updated = await getDiscipline(userId, disciplineId);

  if (!updated) {
    throw notFound(DISCIPLINE_NOT_FOUND);
  }

  return updated;
}

export async function removeDiscipline(
  userId: string,
  disciplineId: string,
): Promise<{ deleted: boolean }> {
  await withTransaction(async (client) => {
    const discipline = await findCurrentEnrollment(userId, disciplineId, client);

    if (!discipline) {
      throw notFound(DISCIPLINE_NOT_FOUND);
    }

    assertWritable(userId, discipline);

    if ((await countEnrollments(discipline.id, client)) > 1) {
      throw conflict("This discipline is shared and cannot be removed personally.");
    }

    const linkedTasks = await countLinkedTasks(userId, discipline.id, client);

    if (linkedTasks > 0) {
      throw conflict(LINKED_TASKS_MESSAGE, { linkedTasks });
    }

    await deleteDisciplineGraph(
      {
        enrollmentId: discipline.enrollmentId,
        disciplineId: discipline.id,
      },
      client,
    );
  });

  return { deleted: true };
}
