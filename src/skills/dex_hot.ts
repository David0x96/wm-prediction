import { z } from 'zod';
import { dex } from '../api/index.js';
import type { HotTokenWithData } from '../api/dexscreener.js';

export const schema = z.object({
  top: z.number().min(1).max(30).default(10).describe('Top N hot tokens'),
  chain: z.string().optional().describe('Filter theo chain: solana | ethereum | bsc | base | arbitrum | ...'),
});

export type Input = z.infer<typeof schema>;

function pct(val: number | undefined): string {
  if (val === undefined) return '—';
  const s = val.toFixed(2) + '%';
  return val >= 0 ? `+${s}` : s;
}

function usdShort(val: number | undefined): string {
  if (val === undefined) return '—';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function formatToken(t: HotTokenWithData, rank: number) {
  const p = t.pair;
  return {
    rank,
    chain: t.chainId,
    symbol: p?.baseToken.symbol ?? t.tokenAddress.slice(0, 8) + '…',
    name: p?.baseToken.name ?? '—',
    token_address: t.tokenAddress,
    price_usd: p?.priceUsd ?? '—',
    price_change_h1: pct(p?.priceChange?.h1),
    price_change_h24: pct(p?.priceChange?.h24),
    volume_h24: usdShort(p?.volume?.h24),
    liquidity_usd: usdShort(p?.liquidity?.usd),
    market_cap: usdShort(p?.marketCap ?? p?.fdv),
    boost_total: t.totalAmount,
    dexscreener_url: t.url,
    dex: p?.dexId ?? '—',
  };
}

export async function run(input: Input) {
  const tokens = await dex.getHotTokensWithData(input.top, input.chain);
  return {
    chain: input.chain ?? 'all',
    count: tokens.length,
    source: 'dexscreener_boosts',
    hot_tokens: tokens.map((t, i) => formatToken(t, i + 1)),
  };
}
