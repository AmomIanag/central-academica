import { api } from "./api";
import type { User } from "./types";

export function getCurrentUser(): Promise<User> {
  return api<User>("/auth/me");
}

export function login(email: string, password: string): Promise<User> {
  return api<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<{ success: boolean }> {
  return api<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}
