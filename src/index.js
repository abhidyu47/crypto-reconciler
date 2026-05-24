'use strict';

const app = require('./api/app');
const { connect } = require('./db/connection');
const config = require('./config');
const logger = require('./utils/logger');

async function start() {
  await connect();
  const server = app.listen(config.server.port, () => {
    logger.info(`Server listening on port ${config.server.port}`, { env: config.server.env });
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      const { disconnect } = require('./db/connection');
      await disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
