import { afterEach, describe, expect, it, vi } from "vitest";
import { createTask, listTasks } from "./tasks-api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("tasks HTTP client", () => {
  it("lists tasks with credentials and the browser time zone", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        data: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listTasks({ status: "pending", from: "2026-09-20", to: "2026-09-20" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("http://localhost:3001/me/tasks?");
    expect(url).toContain("status=pending");
    expect(url).toContain("from=2026-09-20");
    expect(url).toContain("timeZone=");
    expect(init.credentials).toBe("include");
  });

  it("creates a task with a JSON body and credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Ler",
          description: null,
          priority: "normal",
          discipline: null,
          due: null,
          status: "pending",
          overdue: false,
          completedAt: null,
          createdAt: "2026-09-17T00:00:00.000Z",
          updatedAt: "2026-09-17T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createTask({ title: "Ler", due: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe(JSON.stringify({ title: "Ler", due: null }));
  });
});
