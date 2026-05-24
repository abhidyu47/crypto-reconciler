'use strict';

const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
    config: {
      timestampToleranceSeconds: { type: Number, required: true },
      quantityTolerancePct: { type: Number, required: true },
    },
    inputs: { exchangeFile: String, userFile: String },
    summary: {
      totalExchange: { type: Number, default: 0 },
      totalUser: { type: Number, default: 0 },
      ingestionErrorsExchange: { type: Number, default: 0 },
      ingestionErrorsUser: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      conflicting: { type: Number, default: 0 },
      unmatchedExchange: { type: Number, default: 0 },
      unmatchedUser: { type: Number, default: 0 },
    },
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
