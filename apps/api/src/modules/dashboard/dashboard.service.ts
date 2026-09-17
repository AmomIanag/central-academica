import { roundAverage } from "../academic/grades";
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

  const [term, disciplines, upcomingAssessments] = await Promise.all([
    findCurrentTerm(),
    listDisciplines(userId),
    listUpcomingAssessments(userId, UPCOMING_ASSESSMENTS_LIMIT),
  ]);

  const averages = disciplines
    .map((discipline) => discipline.average)
    .filter((average): average is number => average !== null);
  const overallAverage =
    averages.length === 0
      ? null
      : roundAverage(averages.reduce((total, average) => total + average, 0) / averages.length);

  return {
    student,
    term,
    overallAverage,
    disciplineCount: disciplines.length,
    statusSummary: {
      inProgress: disciplines.filter((discipline) => discipline.status === "em_andamento").length,
      approved: disciplines.filter((discipline) => discipline.status === "aprovado").length,
      failed: disciplines.filter((discipline) => discipline.status === "reprovado").length,
    },
    upcomingAssessments,
  };
}
