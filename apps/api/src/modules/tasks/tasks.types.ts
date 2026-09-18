export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "pending" | "completed";

export type TaskDue =
  | null
  | {
      kind: "date";
      date: string;
    }
  | {
      kind: "datetime";
      at: string;
    };

export type TaskDiscipline = {
  id: string;
  code: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  discipline: TaskDiscipline | null;
  due: TaskDue;
  status: TaskStatus;
  overdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskSummary = {
  pendingCount: number;
  overdueCount: number;
  upcoming: Task[];
};

export type EnrollmentOption = {
  id: string;
  code: string;
  name: string;
  term: {
    label: string;
  };
};
