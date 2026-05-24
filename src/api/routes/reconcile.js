'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ReconciliationRun = require('../../db/models/ReconciliationRun');
const { ingest } = require('../../ingestion/ingestor');
const { runMatching } = require('../../matching/engine');
const config = require('../../config');
const logger = require('../../utils/logger');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const runId = uuidv4();
    const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../data');
    const exchangeFile = req.body?.exchangeFile || path.join(dataDir, 'exchange_transactions.csv');
    const userFile = req.body?.userFile || path.join(dataDir, 'user_transactions.csv');

    const effectiveConfig = {
      timestampToleranceSeconds: req.body?.timestampToleranceSeconds ?? config.matching.timestampToleranceSeconds,
      quantityTolerancePct: req.body?.quantityTolerancePct ?? config.matching.quantityTolerancePct,
    };

    if (typeof effectiveConfig.timestampToleranceSeconds !== 'number' || effectiveConfig.timestampToleranceSeconds <= 0) {
      return res.status(400).json({ error: 'timestampToleranceSeconds must be a positive number' });
    }
    if (typeof effectiveConfig.quantityTolerancePct !== 'number' || effectiveConfig.quantityTolerancePct < 0) {
      return res.status(400).json({ error: 'quantityTolerancePct must be a non-negative number' });
    }

    const run = await ReconciliationRun.create({ runId, status: 'running', config: effectiveConfig, inputs: { exchangeFile, userFile }, startedAt: new Date() });
    logger.info('Reconciliation run started', { runId, effectiveConfig });

    setImmediate(() => executeRun(run, exchangeFile, userFile, effectiveConfig).catch((err) => {
      logger.error('Unhandled error in reconciliation run', { runId, error: err.message });
    }));

    return res.status(202).json({ runId, status: 'running', message: 'Reconciliation started. Poll GET /report/:runId/summary for status.' });
  } catch (err) {
    next(err);
  }
});

async function executeRun(run, exchangeFile, userFile, effectiveConfig) {
  const { runId } = run;
  try {
    const ingestionStats = await ingest(exchangeFile, userFile, runId);
    const matchSummary = await runMatching(runId, effectiveConfig);
    await ReconciliationRun.updateOne({ runId }, {
      status: 'completed',
      completedAt: new Date(),
      summary: {
        totalExchange: ingestionStats.exchangeCount,
        totalUser: ingestionStats.userCount,
        ingestionErrorsExchange: ingestionStats.exchangeErrors,
        ingestionErrorsUser: ingestionStats.userErrors,
        matched: matchSummary.matched,
        conflicting: matchSummary.conflicting,
        unmatchedExchange: matchSummary.unmatchedExchange,
        unmatchedUser: matchSummary.unmatchedUser,
      },
    });
    logger.info('Reconciliation run completed', { runId, matchSummary });
  } catch (err) {
    logger.error('Reconciliation run failed', { runId, error: err.message });
    await ReconciliationRun.updateOne({ runId }, { status: 'failed', completedAt: new Date(), errorMessage: err.message });
  }
}

module.exports = router;
