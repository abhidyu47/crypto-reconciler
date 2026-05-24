'use strict';

const { typesAreCompatible } = require('../src/utils/typeNormalizer');

describe('Matching logic - quantity tolerance', () => {
  function quantityDiffPct(a, b) {
    if (a == null || b == null) return Infinity;
    if (a === 0 && b === 0) return 0;
    if (a === 0 || b === 0) return Infinity;
    return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
  }
  test('exact quantities have 0% diff', () => { expect(quantityDiffPct(0.5, 0.5)).toBe(0); });
  test('null quantities return Infinity', () => { expect(quantityDiffPct(null, 0.5)).toBe(Infinity); });
  test('zero and nonzero return Infinity', () => { expect(quantityDiffPct(0, 1)).toBe(Infinity); });
});

describe('Timestamp tolerance', () => {
  function withinWindow(ts1, ts2, toleranceSecs) {
    return Math.abs((new Date(ts1) - new Date(ts2)) / 1000) <= toleranceSecs;
  }
  test('32 second difference is within 300s window', () => {
    expect(withinWindow('2024-03-01T09:00:32Z', '2024-03-01T09:00:00Z', 300)).toBe(true);
  });
  test('1 hour difference exceeds 300s window', () => {
    expect(withinWindow('2024-03-01T09:00:00Z', '2024-03-01T10:00:00Z', 300)).toBe(false);
  });
});