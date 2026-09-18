import { describe, expect, it, vi } from "vitest";
import { createGracefulShutdown } from "./shutdown";

describe("createGracefulShutdown", () => {
  it("closes the HTTP server and PostgreSQL pool once", async () => {
    const close = vi.fn((callback?: (error?: Error) => void) => {
      callback?.();
    });
    const end = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const log = vi.fn();
    const shutdown = createGracefulShutdown({
      server: { close },
      pool: { end },
      exit,
      log,
    });

    shutdown("SIGTERM");
    shutdown("SIGINT");

    expect(close).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("Received SIGTERM, shutting down");

    await vi.waitFor(() => {
      expect(end).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    });
  });

  it("exits with status 1 when the HTTP server fails to close", async () => {
    const close = vi.fn((callback?: (error?: Error) => void) => {
      callback?.(new Error("already closed"));
    });
    const end = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const shutdown = createGracefulShutdown({
      server: { close },
      pool: { end },
      exit,
    });

    shutdown("SIGTERM");

    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
