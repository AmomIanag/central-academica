import { api } from "./api";
import { browserTimeZone } from "./datetime";
import type {
  EnrollmentOption,
  Task,
  TaskListFilters,
  TaskPatchPayload,
  TaskSummary,
  TaskWritePayload,
} from "./tasks";

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export function listTasks(
  filters: TaskListFilters & { from?: string; to?: string; limit?: number; offset?: number } = {},
): Promise<Task[]> {
  return api<Task[]>(
    `/me/tasks${queryString({
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      disciplineId: filters.disciplineId || undefined,
      from: filters.from,
      to: filters.to,
      timeZone: browserTimeZone(),
      limit: filters.limit,
      offset: filters.offset,
    })}`,
  );
}

export function createTask(payload: TaskWritePayload): Promise<Task> {
  return api<Task>("/me/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTask(id: string): Promise<Task> {
  return api<Task>(`/me/tasks/${id}${queryString({ timeZone: browserTimeZone() })}`);
}

export function patchTask(id: string, payload: TaskPatchPayload): Promise<Task> {
  return api<Task>(`/me/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function completeTask(id: string): Promise<Task> {
  return api<Task>(`/me/tasks/${id}/complete`, { method: "POST" });
}

export function reopenTask(id: string): Promise<Task> {
  return api<Task>(`/me/tasks/${id}/reopen`, { method: "POST" });
}

export function deleteTask(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/me/tasks/${id}`, { method: "DELETE" });
}

export function getTaskSummary(): Promise<TaskSummary> {
  return api<TaskSummary>(`/me/tasks/summary${queryString({ timeZone: browserTimeZone() })}`);
}

export function getTaskOptions(): Promise<{ disciplines: EnrollmentOption[] }> {
  return api<{ disciplines: EnrollmentOption[] }>("/me/tasks/options");
}
