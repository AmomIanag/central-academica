import type { Server } from "node:http";
import type { Pool } from "pg";

export type ShutdownDeps = {
  server: Pick<Server, "close">;
  pool: Pick<Pool, "end">;
  exit: (code: number) => void;
  log?: (message: string) => void;
};

export function createGracefulShutdown(deps: ShutdownDeps): (signal: string) => void {
  let shuttingDown = false;

  return function shutdown(signal: string): void {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    deps.log?.(`Received ${signal}, shutting down`);

    deps.server.close((error) => {
      void deps.pool
        .end()
        .catch(() => undefined)
        .finally(() => {
          deps.exit(error ? 1 : 0);
        });
    });
  };
}

export function attachGracefulShutdown(server: Server, pool: Pool): void {
  const shutdown = createGracefulShutdown({
    server,
    pool,
    exit: (code) => process.exit(code),
    log: (message) => console.log(message),
  });

  process.once("SIGTERM", () => {
    shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    shutdown("SIGINT");
  });
}
