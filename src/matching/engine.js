'use strict';

const Transaction = require('../db/models/Transaction');
const ReportEntry = require('../db/models/ReportEntry');
const { typesAreCompatible } = require('../utils/typeNormalizer');
const logger = require('../utils/logger');

async function runMatching(runId, cfg) {
  const { timestampToleranceSeconds, quantityTolerancePct } = cfg;

  const [exchangeTxns, userTxns] = await Promise.all([
    Transaction.find({ runId, source: 'exchange', isInvalid: false }).lean(),
    Transaction.find({ runId, source: 'user', isInvalid: false }).lean(),
  ]);

  logger.info('Starting matching', { runId, validExchange: exchangeTxns.length, validUser: userTxns.length });

  const reportEntries = [];
  const matchedExchange = new Set();
  const matchedUser = new Set();

  // Pass 1: ID-based matching
  for (const exc of exchangeTxns) {
    const excIdNum = extractIdNumber(exc.normalized.transaction_id);
    if (excIdNum === null) continue;

    for (const usr of userTxns) {
      if (matchedUser.has(usr._id.toString())) continue;
      const usrIdNum = extractIdNumber(usr.normalized.transaction_id);
      if (usrIdNum === null || excIdNum !== usrIdNum) continue;

      reportEntries.push(buildPairEntry(runId, exc, usr, timestampToleranceSeconds, quantityTolerancePct, 'id_match'));
      matchedExchange.add(exc._id.toString());
      matchedUser.add(usr._id.toString());
      break;
    }
  }

  logger.info(`Pass 1 complete: ${reportEntries.length} ID-matched pairs`, { runId });

  // Pass 2: Proximity-based matching
  const unmatchedExc = exchangeTxns.filter((t) => !matchedExchange.has(t._id.toString()));
  const unmatchedUsr = userTxns.filter((t) => !matchedUser.has(t._id.toString()));

  for (const exc of unmatchedExc) {
    if (!exc.normalized.timestamp) continue;

    let bestUser = null;
    let bestTimeDiff = Infinity;
    let bestQtyDiff = Infinity;

    for (const usr of unmatchedUsr) {
      if (matchedUser.has(usr._id.toString())) continue;
      if (!usr.normalized.timestamp) continue;
      if (exc.normalized.asset !== usr.normalized.asset) continue;
      if (!typesAreCompatible(exc.normalized.type, usr.normalized.type)) continue;

      const timeDiff = Math.abs((new Date(exc.normalized.timestamp) - new Date(usr.normalized.timestamp)) / 1000);
      if (timeDiff > timestampToleranceSeconds) continue;

      const qtyDiff = quantityDiffPct(exc.normalized.quantity, usr.normalized.quantity);

      if (timeDiff < bestTimeDiff || (timeDiff === bestTimeDiff && qtyDiff < bestQtyDiff)) {
        bestUser = usr;
        bestTimeDiff = timeDiff;
        bestQtyDiff = qtyDiff;
      }
    }

    if (bestUser) {
      reportEntries.push(buildPairEntry(runId, exc, bestUser, timestampToleranceSeconds, quantityTolerancePct, 'proximity'));
      matchedExchange.add(exc._id.toString());
      matchedUser.add(bestUser._id.toString());
    }
  }

  logger.info(`Pass 2 complete. Total paired: ${reportEntries.length}`, { runId });

  for (const exc of exchangeTxns) {
    if (!matchedExchange.has(exc._id.toString())) {
      reportEntries.push({ runId, category: 'unmatched_exchange', reason: 'No matching user transaction found within tolerance window', exchangeTransactionId: exc._id, userTransactionId: null, exchangeRaw: exc.raw, userRaw: null, deltas: null });
    }
  }

  for (const usr of userTxns) {
    if (!matchedUser.has(usr._id.toString())) {
      reportEntries.push({ runId, category: 'unmatched_user', reason: 'No matching exchange transaction found within tolerance window', exchangeTransactionId: null, userTransactionId: usr._id, exchangeRaw: null, userRaw: usr.raw, deltas: null });
    }
  }

  const invalidExchange = await Transaction.find({ runId, source: 'exchange', isInvalid: true }).lean();
  const invalidUser = await Transaction.find({ runId, source: 'user', isInvalid: true }).lean();

  for (const exc of invalidExchange) {
    reportEntries.push({ runId, category: 'unmatched_exchange', reason: `Row excluded due to data quality errors: ${exc.qualityIssues.map((q) => q.message).join('; ')}`, exchangeTransactionId: exc._id, userTransactionId: null, exchangeRaw: exc.raw, userRaw: null, deltas: null });
  }

  for (const usr of invalidUser) {
    reportEntries.push({ runId, category: 'unmatched_user', reason: `Row excluded due to data quality errors: ${usr.qualityIssues.map((q) => q.message).join('; ')}`, exchangeTransactionId: null, userTransactionId: usr._id, exchangeRaw: null, userRaw: usr.raw, deltas: null });
  }

  await ReportEntry.insertMany(reportEntries, { ordered: false });

  const summary = {
    matched: reportEntries.filter((e) => e.category === 'matched').length,
    conflicting: reportEntries.filter((e) => e.category === 'conflicting').length,
    unmatchedExchange: reportEntries.filter((e) => e.category === 'unmatched_exchange').length,
    unmatchedUser: reportEntries.filter((e) => e.category === 'unmatched_user').length,
  };

  logger.info('Matching complete', { runId, ...summary });
  return summary;
}

function extractIdNumber(id) {
  if (!id) return null;
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function quantityDiffPct(a, b) {
  if (a == null || b == null) return Infinity;
  if (a === 0 && b === 0) return 0;
  if (a === 0 || b === 0) return Infinity;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

function buildPairEntry(runId, exc, usr, timestampToleranceSeconds, quantityTolerancePct, matchMethod) {
  const timeDiffSeconds = exc.normalized.timestamp && usr.normalized.timestamp
    ? Math.abs((new Date(exc.normalized.timestamp) - new Date(usr.normalized.timestamp)) / 1000)
    : null;

  const qtyDiff = quantityDiffPct(exc.normalized.quantity, usr.normalized.quantity);
  const timestampOk = timeDiffSeconds === null || timeDiffSeconds <= timestampToleranceSeconds;
  const quantityOk = qtyDiff <= quantityTolerancePct;
  const isMatch = timestampOk && quantityOk;

  const reasons = [];
  if (!timestampOk) reasons.push(`Timestamp difference ${timeDiffSeconds.toFixed(0)}s exceeds tolerance of ${timestampToleranceSeconds}s`);
  if (!quantityOk) reasons.push(`Quantity difference ${(qtyDiff * 100).toFixed(4)}% exceeds tolerance of ${(quantityTolerancePct * 100).toFixed(2)}%`);
  if (isMatch) {
    const typeNote = exc.normalized.type !== usr.normalized.type ? ` (perspective pair: ${exc.normalized.type} <-> ${usr.normalized.type})` : '';
    reasons.push(`Matched via ${matchMethod}${typeNote}`);
  }

  return {
    runId,
    category: isMatch ? 'matched' : 'conflicting',
    reason: reasons.join('; '),
    exchangeTransactionId: exc._id,
    userTransactionId: usr._id,
    exchangeRaw: exc.raw,
    userRaw: usr.raw,
    deltas: { timestampDiffSeconds: timeDiffSeconds, quantityDiffPct: isFinite(qtyDiff) ? qtyDiff : null },
  };
}

module.exports = { runMatching };
