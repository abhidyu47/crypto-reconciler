'use strict';

const { stringify } = require('csv-stringify/sync');
const ReportEntry = require('../db/models/ReportEntry');

const CATEGORY_LABEL = {
  matched: 'Matched',
  conflicting: 'Conflicting',
  unmatched_user: 'Unmatched (User only)',
  unmatched_exchange: 'Unmatched (Exchange only)',
};

async function exportReportCsv(runId) {
  const entries = await ReportEntry.find({ runId }).lean();
  return stringify(entries.map(flattenEntry), { header: true });
}

function flattenEntry(entry) {
  const exc = entry.exchangeRaw || {};
  const usr = entry.userRaw || {};
  return {
    category: CATEGORY_LABEL[entry.category] || entry.category,
    reason: entry.reason,
    exc_transaction_id: exc.transaction_id || '',
    exc_timestamp: exc.timestamp || '',
    exc_type: exc.type || '',
    exc_asset: exc.asset || '',
    exc_quantity: exc.quantity ?? '',
    exc_price_usd: exc.price_usd ?? '',
    exc_fee: exc.fee ?? '',
    exc_note: exc.note || '',
    usr_transaction_id: usr.transaction_id || '',
    usr_timestamp: usr.timestamp || '',
    usr_type: usr.type || '',
    usr_asset: usr.asset || '',
    usr_quantity: usr.quantity ?? '',
    usr_price_usd: usr.price_usd ?? '',
    usr_fee: usr.fee ?? '',
    usr_note: usr.note || '',
    delta_timestamp_seconds: entry.deltas?.timestampDiffSeconds ?? '',
    delta_quantity_pct: entry.deltas?.quantityDiffPct != null ? (entry.deltas.quantityDiffPct * 100).toFixed(6) : '',
  };
}

module.exports = { exportReportCsv };
