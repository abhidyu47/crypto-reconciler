'use strict';

const CANONICAL_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
};

const PERSPECTIVE_PAIRS = new Map([
  ['TRANSFER_IN', 'TRANSFER_OUT'],
  ['TRANSFER_OUT', 'TRANSFER_IN'],
]);

function normalizeType(rawType) {
  if (!rawType || typeof rawType !== 'string') return null;
  const upper = rawType.trim().toUpperCase();
  return CANONICAL_TYPES[upper] || null;
}

function typesAreCompatible(typeA, typeB) {
  if (!typeA || !typeB) return false;
  if (typeA === typeB) return true;
  return PERSPECTIVE_PAIRS.get(typeA) === typeB;
}

module.exports = { normalizeType, typesAreCompatible, CANONICAL_TYPES };
