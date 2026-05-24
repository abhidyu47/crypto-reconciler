'use strict';

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

let isConnected = false;

async function connect() {
  if (isConnected) return;
  await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
  isConnected = true;
  logger.info(`MongoDB connected: ${config.mongo.uri}`);
}

async function disconnect() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected');
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
  isConnected = false;
});

mongoose.connection.on('disconnected', () => { isConnected = false; });

module.exports = { connect, disconnect };
