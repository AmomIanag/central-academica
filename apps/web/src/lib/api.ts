const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Failed to reach the API.");
  }

  const body = (await response.json().catch(() => null)) as ErrorBody | DataBody<T> | null;

  if (!response.ok) {
    const error = body && "error" in body ? body.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "Request failed.",
      error?.details,
    );
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
        return "Disciplina não encontrada.";
      case "UNAUTHENTICATED":
        return "Sessão expirada. Entre novamente.";
      case "NETWORK_ERROR":
        return "Não foi possível conectar à API.";
      default:
        return "Não foi possível carregar os dados.";
    }
  }

  return "Não foi possível conectar à API.";
}
