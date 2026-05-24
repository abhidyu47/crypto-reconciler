'use strict';

const mongoose = require('mongoose');

const reportEntrySchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    exchangeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    userTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    exchangeRaw: mongoose.Schema.Types.Mixed,
    userRaw: mongoose.Schema.Types.Mixed,
    deltas: {
      timestampDiffSeconds: Number,
      quantityDiffPct: Number,
    },
  },
  { timestamps: true },
);

reportEntrySchema.index({ runId: 1, category: 1 });

module.exports = mongoose.model('ReportEntry', reportEntrySchema);
