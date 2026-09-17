import { computeDisciplineProgress, roundAverage } from "../academic/grades";
import {
  findCurrentEnrollment,
  listCurrentEnrollments,
  type DisciplineRecord,
} from "./disciplines.repository";

export type DisciplineSummary = {
  id: string;
  code: string;
  name: string;
  professor: {
    id: string;
    name: string;
  };
  average: number | null;
  status: "em_andamento" | "aprovado" | "reprovado";
};

export type DisciplineDetail = DisciplineSummary & {
  term: {
    id: string;
    label: string;
  };
  assessments: Array<{
    id: string;
    name: string;
    weight: number;
    dueOn: string | null;
    score: number | null;
  }>;
};

function toSummary(discipline: DisciplineRecord): DisciplineSummary {
  const progress = computeDisciplineProgress(discipline.assessments);

  return {
    id: discipline.id,
    code: discipline.code,
    name: discipline.name,
    professor: discipline.professor,
    average: roundAverage(progress.average),
    status: progress.status,
  };
}

export async function listDisciplines(userId: string): Promise<DisciplineSummary[]> {
  const disciplines = await listCurrentEnrollments(userId);
  return disciplines.map(toSummary);
}

export async function getDiscipline(userId: string, disciplineId: string): Promise<DisciplineDetail | null> {
  const discipline = await findCurrentEnrollment(userId, disciplineId);

  if (!discipline) {
    return null;
  }

  return {
    ...toSummary(discipline),
    term: discipline.term,
    assessments: discipline.assessments.map((assessment) => ({
      id: assessment.id,
      name: assessment.name,
      weight: assessment.weight,
      dueOn: assessment.dueOn,
      score: assessment.score,
    })),
  };
}
