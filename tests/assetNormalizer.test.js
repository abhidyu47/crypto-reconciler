'use strict';

const { normalizeAsset } = require('../src/utils/assetNormalizer');

describe('normalizeAsset', () => {
  test('returns null for empty/null input', () => {
    expect(normalizeAsset(null)).toBeNull();
    expect(normalizeAsset('')).toBeNull();
  });
  test('maps full name aliases to tickers', () => {
    expect(normalizeAsset('bitcoin')).toBe('BTC');
    expect(normalizeAsset('ethereum')).toBe('ETH');
    expect(normalizeAsset('solana')).toBe('SOL');
  });
  test('normalises existing tickers to uppercase', () => {
    expect(normalizeAsset('btc')).toBe('BTC');
    expect(normalizeAsset('eth')).toBe('ETH');
  });
  test('falls back to uppercased input for unknown assets', () => {
    expect(normalizeAsset('NEWCOIN')).toBe('NEWCOIN');
  });
  test('trims whitespace', () => {
    expect(normalizeAsset('  BTC  ')).toBe('BTC');
  });
});