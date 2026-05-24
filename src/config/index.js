'use strict';

require('dotenv').config();

const config = {
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_reconciler',
  },

  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  matching: {
    // Seconds of allowed clock skew between exchange and user timestamps
    timestampToleranceSeconds: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS, 10) || 300,
    // Fractional quantity tolerance  (0.01 = 1%)
    quantityTolerancePct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};

module.exports = config;