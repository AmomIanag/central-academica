import { env } from "./config/env";
import { app } from "./app";
import { pool } from "./db/pool";
import { attachGracefulShutdown } from "./lifecycle/shutdown";

function onListening(): void {
  if (env.nodeEnv === "production") {
    console.log(`API listening on ${env.host}:${env.port}`);
    return;
  }

  console.log(`API listening on http://localhost:${env.port}`);
}

const server = env.host
  ? app.listen(env.port, env.host, onListening)
  : app.listen(env.port, onListening);

attachGracefulShutdown(server, pool);
