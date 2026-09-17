export type AcademicStatus = "em_andamento" | "aprovado" | "reprovado";

export type User = {
  id: string;
  name: string;
  email: string;
  ra: string | null;
  courseName: string | null;
  role: string;
};

export type Term = {
  id: string;
  label: string;
};

export type Professor = {
  id: string;
  name: string;
};

export type DisciplineSummary = {
  id: string;
  code: string;
  name: string;
  professor: Professor;
  average: number | null;
  status: AcademicStatus;
};

export type Assessment = {
  id: string;
  name: string;
  weight: number;
  dueOn: string | null;
  score: number | null;
};

export type DisciplineDetail = DisciplineSummary & {
  term: Term;
  assessments: Assessment[];
};

export type UpcomingAssessment = {
  id: string;
  name: string;
  dueOn: string;
  discipline: {
    id: string;
    code: string;
    name: string;
  };
};

export type Dashboard = {
  student: {
    id: string;
    name: string;
    ra: string | null;
    courseName: string | null;
  };
  term: Term | null;
  overallAverage: number | null;
  disciplineCount: number;
  statusSummary: {
    inProgress: number;
    approved: number;
    failed: number;
  };
  upcomingAssessments: UpcomingAssessment[];
};
