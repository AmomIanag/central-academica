import { api } from "./api";
import type {
  AttendancePatchPayload,
  DisciplineDetail,
  DisciplinePatchPayload,
  DisciplineSummary,
  DisciplineWritePayload,
  GradePatchPayload,
} from "./types";

export function listDisciplines(): Promise<DisciplineSummary[]> {
  return api<DisciplineSummary[]>("/me/disciplines");
}

export function getDiscipline(id: string): Promise<DisciplineDetail> {
  return api<DisciplineDetail>(`/me/disciplines/${id}`);
}

export function createDiscipline(payload: DisciplineWritePayload): Promise<DisciplineDetail> {
  return api<DisciplineDetail>("/me/disciplines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchDiscipline(id: string, payload: DisciplinePatchPayload): Promise<DisciplineDetail> {
  return api<DisciplineDetail>(`/me/disciplines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function patchDisciplineGrade(id: string, payload: GradePatchPayload): Promise<DisciplineDetail> {
  return api<DisciplineDetail>(`/me/disciplines/${id}/grades`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function patchDisciplineAttendance(
  id: string,
  payload: AttendancePatchPayload,
): Promise<DisciplineDetail> {
  return api<DisciplineDetail>(`/me/disciplines/${id}/attendance`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDiscipline(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/me/disciplines/${id}`, {
    method: "DELETE",
  });
}
