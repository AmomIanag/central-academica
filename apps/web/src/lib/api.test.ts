import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  api,
  errorMessage,
  isUnauthenticated,
  resetUnauthorizedSignal,
  setUnauthorizedListener,
} from "./api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setUnauthorizedListener(null);
  resetUnauthorizedSignal();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("isUnauthenticated", () => {
  it("treats session 401 as unauthenticated", () => {
    expect(isUnauthenticated(new ApiError(401, "UNAUTHENTICATED", "x"))).toBe(true);
  });

  it("does not treat invalid credentials as an expired session", () => {
    expect(isUnauthenticated(new ApiError(401, "INVALID_CREDENTIALS", "x"))).toBe(false);
  });
});

describe("errorMessage", () => {
  it("maps known API codes to Portuguese copy", () => {
    expect(errorMessage(new ApiError(401, "INVALID_CREDENTIALS", "x"))).toBe(
      "E-mail ou senha inválidos.",
    );
    expect(errorMessage(new ApiError(0, "NETWORK_ERROR", "x"))).toBe(
      "Não foi possível conectar à API.",
    );
    expect(errorMessage(new ApiError(404, "NOT_FOUND", "x"))).toBe("Não encontrado.");
    expect(errorMessage(new ApiError(403, "CSRF_REJECTED", "x"))).toBe(
      "A requisição foi rejeitada por segurança. Recarregue a página e tente de novo.",
    );
    expect(errorMessage(new ApiError(409, "CONFLICT", "x"))).toBe(
      "Não foi possível concluir a operação por um conflito. Verifique as tarefas vinculadas e tente de novo.",
    );
    expect(errorMessage(new ApiError(429, "TOO_MANY_REQUESTS", "x"))).toBe(
      "Muitas tentativas de login. Tente novamente em instantes.",
    );
    expect(errorMessage(new ApiError(413, "PAYLOAD_TOO_LARGE", "x"))).toBe("A requisição é grande demais.");
  });
});

describe("api 401 handling", () => {
  it("notifies the unauthorized listener once for a session 401", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    const listener = vi.fn();
    setUnauthorizedListener(listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: { code: "UNAUTHENTICATED", message: "Authentication required." },
        }),
      ),
    );

    await expect(api("/auth/me")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
    await expect(api("/me/dashboard")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not treat invalid credentials as a session expiry", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    const listener = vi.fn();
    setUnauthorizedListener(listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        }),
      ),
    );

    await expect(api("/auth/login")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
