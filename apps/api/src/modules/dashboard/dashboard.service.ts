import { computeAnnualResult, roundAverage } from "../academic/grades";
import { listCurrentEnrollments } from "../disciplines/disciplines.repository";
import { listDisciplines } from "../disciplines/disciplines.service";
import {
  findCurrentTerm,
  findStudent,
  listUpcomingAssessments,
} from "./dashboard.repository";

export const UPCOMING_ASSESSMENTS_LIMIT = 5;

export async function getDashboard(userId: string) {
  const student = await findStudent(userId);

  if (!student) {
    return null;
  }

  const [term, disciplines, records, upcomingAssessments] = await Promise.all([
    findCurrentTerm(),
    listDisciplines(userId),
    listCurrentEnrollments(userId),
    listUpcomingAssessments(userId, UPCOMING_ASSESSMENTS_LIMIT),
  ]);

  const annualAverages = records
    .map((record) =>
      computeAnnualResult(
        record.assessments.map((assessment) => ({
          semester: assessment.semester,
          kind: assessment.kind,
          score: assessment.score,
        })),
      ).mp,
    )
    .filter((mp): mp is number => mp !== null);
  const overallAverage =
    annualAverages.length === 0
      ? null
      : roundAverage(annualAverages.reduce((total, mp) => total + mp, 0) / annualAverages.length);

  return {
    student,
    term,
    overallAverage,
    disciplineCount: disciplines.length,
    statusSummary: {
      inProgress: disciplines.filter((discipline) => discipline.status === "EM_ANDAMENTO").length,
      approved: disciplines.filter((discipline) => discipline.status === "APROVADO_DIRETO").length,
      exam: disciplines.filter((discipline) => discipline.status === "EXAME").length,
      failed: disciplines.filter((discipline) => discipline.status === "REPROVADO_DIRETO").length,
    },
    upcomingAssessments,
  };
}
