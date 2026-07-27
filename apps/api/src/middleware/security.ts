import type { NextFunction, Request, RequestHandler, Response } from "express";

interface RateLimitOptions {
  max: number;
  windowMs: number;
}

interface RateEntry {
  count: number;
  resetAt: number;
}

export function createSecurityHeaders(nodeEnv: string): RequestHandler {
  return (_request, response, next) => {
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Resource-Policy", "same-site");
    response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    if (nodeEnv === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  };
}

export function createRateLimiter({ max, windowMs }: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateEntry>();
  let requestsSinceCleanup = 0;

  return (request, response, next) => {
    const now = Date.now();
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 100) {
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
      requestsSinceCleanup = 0;
    }

    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const current = entries.get(key);
    const entry =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1;
    entries.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    response.setHeader("RateLimit-Limit", String(max));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1_000)));
    if (entry.count > max) {
      response.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1_000)));
      response.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
      return;
    }
    next();
  };
}

export function enforceRequestLimits(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (request.originalUrl.length > 2_048 || Object.keys(request.query).length > 20) {
    response.status(422).json({
      error: { code: "VALIDATION_ERROR", message: "Request query is too large" },
    });
    return;
  }
  next();
}

export function handleBodyParserError(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  const parserError = error as { status?: number; type?: string };
  if (
    parserError?.status === 400 ||
    parserError?.status === 413 ||
    parserError?.type === "entity.parse.failed" ||
    parserError?.type === "entity.too.large"
  ) {
    response.status(422).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid or oversized request body" },
    });
    return;
  }
  next(error);
}
