'use strict';

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['exchange', 'user'], required: true, index: true },
    runId: { type: String, required: true, index: true },
    raw: {
      transaction_id: String,
      timestamp: String,
      type: String,
      asset: String,
      quantity: mongoose.Schema.Types.Mixed,
      price_usd: mongoose.Schema.Types.Mixed,
      fee: mongoose.Schema.Types.Mixed,
      note: String,
    },
    normalized: {
      transaction_id: String,
      timestamp: Date,
      type: String,
      asset: String,
      quantity: Number,
      price_usd: Number,
      fee: Number,
    },
    qualityIssues: [
      {
        field: String,
        severity: { type: String, enum: ['warning', 'error'] },
        message: String,
      },
    ],
    isInvalid: { type: Boolean, default: false },
  },
  { timestamps: true },
);

transactionSchema.index({ runId: 1, source: 1 });
transactionSchema.index({ runId: 1, 'normalized.asset': 1, 'normalized.timestamp': 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
