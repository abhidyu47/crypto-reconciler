'use strict';

const fs = require('fs');
const { parse } = require('csv-parse');
const logger = require('../utils/logger');
const { normalizeAsset } = require('../utils/assetNormalizer');
const { normalizeType } = require('../utils/typeNormalizer');

const REQUIRED_COLUMNS = ['transaction_id', 'timestamp', 'type', 'asset', 'quantity'];

async function parseCsv(filePath, source) {
  const rows = await readCsvFile(filePath);
  logger.info(`Parsing ${rows.length} rows from ${source} file`, { filePath });
  return rows.map((raw, rowIndex) => processRow(raw, rowIndex, source));
}

function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .on('error', (err) => reject(new Error(`Cannot read file ${filePath}: ${err.message}`)))
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true, relax_column_count: true, cast: false }))
      .on('data', (record) => records.push(record))
      .on('error', (err) => reject(new Error(`CSV parse error in ${filePath}: ${err.message}`)))
      .on('end', () => resolve(records));
  });
}

function processRow(raw, rowIndex, source) {
  const qualityIssues = [];
  let isInvalid = false;

  for (const col of REQUIRED_COLUMNS) {
    if (raw[col] === undefined || raw[col] === null || raw[col] === '') {
      const severity = col === 'quantity' || col === 'asset' || col === 'type' ? 'error' : 'warning';
      qualityIssues.push({ field: col, severity, message: `Required field '${col}' is missing or empty` });
      if (severity === 'error') isInvalid = true;
    }
  }

  let parsedTimestamp = null;
  if (raw.timestamp) {
    parsedTimestamp = new Date(raw.timestamp);
    if (isNaN(parsedTimestamp.getTime())) {
      parsedTimestamp = null;
      qualityIssues.push({ field: 'timestamp', severity: 'error', message: `Unparseable timestamp: "${raw.timestamp}"` });
      isInvalid = true;
    }
  }

  let parsedQuantity = null;
  if (raw.quantity !== undefined && raw.quantity !== '') {
    parsedQuantity = parseFloat(raw.quantity);
    if (isNaN(parsedQuantity)) {
      qualityIssues.push({ field: 'quantity', severity: 'error', message: `Non-numeric quantity: "${raw.quantity}"` });
      isInvalid = true;
      parsedQuantity = null;
    } else if (parsedQuantity < 0) {
      qualityIssues.push({ field: 'quantity', severity: 'error', message: `Negative quantity (${parsedQuantity}) — likely a data entry error` });
      isInvalid = true;
    } else if (parsedQuantity === 0) {
      qualityIssues.push({ field: 'quantity', severity: 'warning', message: 'Zero quantity — may be a dust or placeholder transaction' });
    }
  }

  let parsedPrice = null;
  if (raw.price_usd !== undefined && raw.price_usd !== '') {
    parsedPrice = parseFloat(raw.price_usd);
    if (isNaN(parsedPrice)) {
      qualityIssues.push({ field: 'price_usd', severity: 'warning', message: `Non-numeric price_usd: "${raw.price_usd}"` });
      parsedPrice = null;
    }
  }

  let parsedFee = null;
  if (raw.fee !== undefined && raw.fee !== '') {
    parsedFee = parseFloat(raw.fee);
    if (isNaN(parsedFee)) {
      qualityIssues.push({ field: 'fee', severity: 'warning', message: `Non-numeric fee: "${raw.fee}"` });
      parsedFee = null;
    }
  }

  const normalizedType = normalizeType(raw.type);
  if (raw.type && !normalizedType) {
    qualityIssues.push({ field: 'type', severity: 'error', message: `Unknown transaction type: "${raw.type}"` });
    isInvalid = true;
  }

  const normalizedAsset = normalizeAsset(raw.asset);
  if (raw.asset && normalizedAsset !== raw.asset.trim().toUpperCase()) {
    qualityIssues.push({ field: 'asset', severity: 'warning', message: `Asset alias "${raw.asset}" normalised to "${normalizedAsset}"` });
  }

  if (qualityIssues.length) {
    const prefix = `[row ${rowIndex + 2}][${source}][${raw.transaction_id || 'NO_ID'}]`;
    for (const issue of qualityIssues) {
      logger[issue.severity === 'error' ? 'warn' : 'info'](`${prefix} ${issue.severity.toUpperCase()} on field '${issue.field}': ${issue.message}`);
    }
  }

  return {
    raw: { ...raw },
    normalized: {
      transaction_id: raw.transaction_id || null,
      timestamp: parsedTimestamp,
      type: normalizedType,
      asset: normalizedAsset,
      quantity: parsedQuantity,
      price_usd: parsedPrice,
      fee: parsedFee,
    },
    qualityIssues,
    isInvalid,
  };
}

module.exports = { parseCsv };
