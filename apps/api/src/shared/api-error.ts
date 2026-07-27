import {
  ERROR_HTTP_STATUS,
  type ApiErrorCode,
  type ApiErrorResponse,
} from "@gym-tracking/contracts";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    if (details) {
      this.details = details;
    }
  }

  toResponse(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}
