'use strict';

const express = require('express');
const ReconciliationRun = require('../../db/models/ReconciliationRun');
const ReportEntry = require('../../db/models/ReportEntry');
const { exportReportCsv } = require('../../reporting/csvExporter');

const router = express.Router();

async function getRun(runId, res) {
  const run = await ReconciliationRun.findOne({ runId }).lean();
  if (!run) { res.status(404).json({ error: `No reconciliation run found for runId: ${runId}` }); return null; }
  return run;
}

router.get('/:runId', async (req, res, next) => {
  try {
    const run = await getRun(req.params.runId, res);
    if (!run) return;

    if (req.query.format === 'csv') {
      if (run.status !== 'completed') return res.status(409).json({ error: `Run not yet complete (status: ${run.status})` });
      const csv = await exportReportCsv(req.params.runId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.runId}.csv"`);
      return res.send(csv);
    }

    const entries = await ReportEntry.find({ runId: req.params.runId }).lean();
    return res.json({ runId: req.params.runId, status: run.status, config: run.config, summary: run.summary, entries });
  } catch (err) { next(err); }
});

router.get('/:runId/summary', async (req, res, next) => {
  try {
    const run = await getRun(req.params.runId, res);
    if (!run) return;
    return res.json({ runId: req.params.runId, status: run.status, config: run.config, summary: run.summary, startedAt: run.startedAt, completedAt: run.completedAt, ...(run.status === 'failed' && { errorMessage: run.errorMessage }) });
  } catch (err) { next(err); }
});

router.get('/:runId/unmatched', async (req, res, next) => {
  try {
    const run = await getRun(req.params.runId, res);
    if (!run) return;
    const entries = await ReportEntry.find({ runId: req.params.runId, category: { $in: ['unmatched_user', 'unmatched_exchange'] } }).lean();
    return res.json({ runId: req.params.runId, total: entries.length, entries: entries.map((e) => ({ category: e.category, reason: e.reason, exchangeRaw: e.exchangeRaw, userRaw: e.userRaw })) });
  } catch (err) { next(err); }
});

module.exports = router;
