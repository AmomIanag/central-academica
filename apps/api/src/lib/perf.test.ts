import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatPerfLog,
  isInstrumentedPerfRoute,
  logPerf,
  PERF_LOG_PREFIX,
  PERF_OP,
  runWithPerfContext,
  timePerf,
} from "./perf";

const SAFE_REQUEST_ID = "req_0123456789abcdef";
const originalPerfLogging = process.env.PERF_LOGGING;

afterEach(() => {
  if (originalPerfLogging === undefined) {
    delete process.env.PERF_LOGGING;
  } else {
    process.env.PERF_LOGGING = originalPerfLogging;
  }
  vi.restoreAllMocks();
});

describe("formatPerfLog", () => {
  it("writes a single parseable line with only route, operation, ms and requestId", () => {
    const line = formatPerfLog({
      route: "/auth/me",
      operation: PERF_OP.authMeFindUser,
      ms: 812.6,
      requestId: SAFE_REQUEST_ID,
    });

    expect(line).toBe(
      `${PERF_LOG_PREFIX} route=/auth/me op=auth.me.findUser ms=813 requestId=${SAFE_REQUEST_ID}`,
    );
    expect(line).toMatch(
      /^\[PERF\] route=\/auth\/me op=auth\.me\.findUser ms=\d+ requestId=req_[0-9a-f]+$/,
    );
    expect(line).not.toMatch(/email|password|cookie|sessionId|postgresql:\/\/|userId|SELECT/i);
  });
});

describe("isInstrumentedPerfRoute", () => {
  it("limits instrumentation to the diagnostic endpoints", () => {
    expect(isInstrumentedPerfRoute("/auth/me")).toBe(true);
    expect(isInstrumentedPerfRoute("/me/dashboard")).toBe(true);
    expect(isInstrumentedPerfRoute("/health")).toBe(false);
    expect(isInstrumentedPerfRoute("/me/disciplines")).toBe(false);
  });
});

describe("timePerf", () => {
  it("runs the work without logging when PERF_LOGGING is off", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await runWithPerfContext({ route: "/auth/me", requestId: SAFE_REQUEST_ID }, () =>
      timePerf(PERF_OP.authMeFindUser, async () => 42),
    );

    expect(result).toBe(42);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs one safe line when enabled inside a request context", async () => {
    process.env.PERF_LOGGING = "true";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    await runWithPerfContext({ route: "/auth/me", requestId: SAFE_REQUEST_ID }, () =>
      timePerf(PERF_OP.authMeFindUser, async () => undefined),
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toMatch(
      /^\[PERF\] route=\/auth\/me op=auth\.me\.findUser ms=\d+ requestId=req_0123456789abcdef$/,
    );
  });

  it("does not log without request context even when enabled", async () => {
    process.env.PERF_LOGGING = "true";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    await timePerf(PERF_OP.authMeFindUser, async () => undefined);
    logPerf(PERF_OP.requestTotal, 12);

    expect(spy).not.toHaveBeenCalled();
  });
});
