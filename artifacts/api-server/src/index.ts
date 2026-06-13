import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"] ?? 8080);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ port: process.env["PORT"] }, "Invalid PORT value — exiting");
  process.exit(1);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Failed to bind server — exiting");
  process.exit(1);
});
