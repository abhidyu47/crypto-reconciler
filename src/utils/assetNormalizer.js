'use strict';

const ALIAS_MAP = {
  bitcoin: 'BTC',
  btc: 'BTC',
  ethereum: 'ETH',
  eth: 'ETH',
  solana: 'SOL',
  sol: 'SOL',
  tether: 'USDT',
  usdt: 'USDT',
  'usd coin': 'USDC',
  usdc: 'USDC',
  matic: 'MATIC',
  polygon: 'MATIC',
  chainlink: 'LINK',
  link: 'LINK',
};

function normalizeAsset(asset) {
  if (!asset || typeof asset !== 'string') return null;
  const key = asset.trim().toLowerCase();
  return ALIAS_MAP[key] || asset.trim().toUpperCase();
}

module.exports = { normalizeAsset };
