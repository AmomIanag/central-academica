export type AcademicStatus = "EM_ANDAMENTO" | "APROVADO_DIRETO" | "EXAME" | "REPROVADO_DIRETO";
export type AssessmentKind = "CP" | "GS";
export type AcademicSemester = 1 | 2;

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

export type Attendance = {
  totalClasses: number;
  absences: number;
  percentage: number | null;
};

export type SemesterGrades = {
  cp: number | null;
  gs: number | null;
  md: number | null;
};

export type DisciplineSummary = {
  id: string;
  code: string;
  name: string;
  academicYear: number;
  professor: Professor;
  attendance: Attendance;
  semester1: SemesterGrades;
  semester2: SemesterGrades;
  mp: number | null;
  status: AcademicStatus;
};

export type DisciplineDetail = DisciplineSummary & {
  term: Term;
};

export type DisciplineWritePayload = {
  name: string;
  professorName: string;
};

export type DisciplinePatchPayload = {
  name?: string;
  professorName?: string;
};

export type GradePatchPayload = {
  semester: AcademicSemester;
  kind: AssessmentKind;
  score: number | null;
};

export type AttendancePatchPayload = {
  totalClasses: number;
  absences: number;
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
    exam: number;
    failed: number;
  };
  upcomingAssessments: UpcomingAssessment[];
};
