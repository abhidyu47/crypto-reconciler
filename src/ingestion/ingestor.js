'use strict';

const Transaction = require('../db/models/Transaction');
const { parseCsv } = require('./csvParser');
const logger = require('../utils/logger');

async function ingest(exchangeFilePath, userFilePath, runId) {
  const [exchangeRows, userRows] = await Promise.all([
    parseCsv(exchangeFilePath, 'exchange'),
    parseCsv(userFilePath, 'user'),
  ]);

  flagDuplicates(exchangeRows, 'exchange');
  flagDuplicates(userRows, 'user');

  const toInsert = [
    ...exchangeRows.map((r) => buildDoc(r, 'exchange', runId)),
    ...userRows.map((r) => buildDoc(r, 'user', runId)),
  ];

  await Transaction.insertMany(toInsert, { ordered: false });

  const exchangeErrors = exchangeRows.filter((r) => r.isInvalid).length;
  const userErrors = userRows.filter((r) => r.isInvalid).length;

  logger.info('Ingestion complete', { runId, exchangeCount: exchangeRows.length, userCount: userRows.length, exchangeErrors, userErrors });

  return { exchangeCount: exchangeRows.length, userCount: userRows.length, exchangeErrors, userErrors };
}

function flagDuplicates(rows, source) {
  const seen = new Map();
  for (let i = 0; i < rows.length; i++) {
    const id = rows[i].normalized.transaction_id;
    if (!id) continue;
    if (seen.has(id)) {
      const firstIdx = seen.get(id);
      logger.warn(`[${source}] Duplicate transaction_id "${id}" at rows ${firstIdx + 2} and ${i + 2}. Flagging row ${i + 2}.`);
      rows[i].qualityIssues.push({ field: 'transaction_id', severity: 'error', message: `Duplicate transaction_id "${id}" — first seen at row ${firstIdx + 2}` });
      rows[i].isInvalid = true;
    } else {
      seen.set(id, i);
    }
  }
}

function buildDoc(parsedRow, source, runId) {
  return { source, runId, raw: parsedRow.raw, normalized: parsedRow.normalized, qualityIssues: parsedRow.qualityIssues, isInvalid: parsedRow.isInvalid };
}

module.exports = { ingest };
