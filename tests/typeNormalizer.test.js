'use strict';

const { normalizeType, typesAreCompatible } = require('../src/utils/typeNormalizer');

describe('normalizeType', () => {
  test('recognises canonical types case-insensitively', () => {
    expect(normalizeType('BUY')).toBe('BUY');
    expect(normalizeType('buy')).toBe('BUY');
    expect(normalizeType('TRANSFER_IN')).toBe('TRANSFER_IN');
    expect(normalizeType('transfer_out')).toBe('TRANSFER_OUT');
  });
  test('returns null for unknown types', () => {
    expect(normalizeType('DEPOSIT')).toBeNull();
    expect(normalizeType(null)).toBeNull();
  });
});

describe('typesAreCompatible', () => {
  test('same type is always compatible', () => {
    expect(typesAreCompatible('BUY', 'BUY')).toBe(true);
  });
  test('TRANSFER_IN and TRANSFER_OUT are perspective pairs', () => {
    expect(typesAreCompatible('TRANSFER_IN', 'TRANSFER_OUT')).toBe(true);
    expect(typesAreCompatible('TRANSFER_OUT', 'TRANSFER_IN')).toBe(true);
  });
  test('BUY and SELL are NOT compatible', () => {
    expect(typesAreCompatible('BUY', 'SELL')).toBe(false);
  });
});