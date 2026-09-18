import { env } from "../config/env";

export const TEST_ORIGIN = env.corsOrigin;

export function withOrigin<T extends { set: (field: string, value: string) => T }>(request: T): T {
  return request.set("Origin", TEST_ORIGIN);
}
