import { joinApiUrl } from "./api-url";

function apiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_URL;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type DataBody<T> = {
  data: T;
};

type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;
let unauthorizedSignaled = false;

export function setUnauthorizedListener(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

export function resetUnauthorizedSignal(): void {
  unauthorizedSignaled = false;
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code !== "INVALID_CREDENTIALS";
}

function signalUnauthorized(error: ApiError): void {
  if (!isUnauthenticated(error) || unauthorizedSignaled) {
    return;
  }

  unauthorizedSignaled = true;
  unauthorizedListener?.();
}

function readError(body: ErrorBody | DataBody<unknown> | null, status: number): ApiError {
  const error = body && "error" in body ? body.error : undefined;

  return new ApiError(
    status,
    error?.code ?? (status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR"),
    error?.message ?? "Request failed.",
    error?.details,
  );
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const API_URL = apiUrl();

  if (!API_URL) {
    throw new ApiError(0, "NETWORK_ERROR", "Failed to reach the API.");
  }

  let response: Response;

  try {
    response = await fetch(joinApiUrl(API_URL, path), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Failed to reach the API.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as ErrorBody | DataBody<T> | null)
    : null;

  if (!response.ok) {
    const error = readError(body, response.status);
    signalUnauthorized(error);
    throw error;
  }

  if (!body || !("data" in body)) {
    throw new ApiError(response.status, "INTERNAL_ERROR", "Invalid API response.");
  }

  return body.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "E-mail ou senha inválidos.";
      case "VALIDATION_ERROR":
        return "Não foi possível validar a requisição.";
      case "NOT_FOUND":
        return "Não encontrado.";
      case "CSRF_REJECTED":
        return "A requisição foi rejeitada por segurança. Recarregue a página e tente de novo.";
      case "CONFLICT":
        return "Não foi possível concluir a operação por um conflito. Verifique as tarefas vinculadas e tente de novo.";
      case "UNAUTHENTICATED":
        return "Sessão expirada. Entre novamente.";
      case "TOO_MANY_REQUESTS":
        return "Muitas tentativas de login. Tente novamente em instantes.";
      case "PAYLOAD_TOO_LARGE":
        return "A requisição é grande demais.";
      case "NETWORK_ERROR":
        return "Não foi possível conectar à API.";
      default:
        return "Não foi possível carregar os dados.";
    }
  }

  return "Não foi possível conectar à API.";
}
