export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = "Resource not found."): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(400, "VALIDATION_ERROR", message, details);
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError(409, "CONFLICT", message, details);
}
