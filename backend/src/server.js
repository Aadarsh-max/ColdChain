import http from 'http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { Setting } from './models/Setting.js';
import app from './app.js';

const server = http.createServer(app);

const start = async () => {
  try {
    await connectDB();
    await Setting.getGlobal();
    server.listen(env.PORT, () => {
      logger.info(`Backend listening on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
};

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);
  server.close();
  try {
    await disconnectDB();
  } catch (err) {
    logger.error(`Shutdown error: ${err.message}`);
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason}`));

start();