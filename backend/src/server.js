const config = require('./config/env');
const { connect, disconnect } = require('./config/db');
const { createApp } = require('./app');
const logger = require('./utils/logger');

async function start() {
  await connect();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Lifeline API listening on http://localhost:${config.port} (${config.env})`);
  });

  // Graceful shutdown so in-flight requests finish and Mongo closes cleanly.
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { start, createApp };
