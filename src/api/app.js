'use strict';

const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const reconcileRouter = require('./routes/reconcile');
const reportRouter = require('./routes/report');

const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/reconcile', reconcileRouter);
app.use('/report', reportRouter);
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use(errorHandler);

module.exports = app;
