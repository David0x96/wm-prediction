import { z } from 'zod';
import { gecko } from '../api/index.js';
import type { GeckoPool, GeckoToken } from '../api/types.js';

export const schema = z.object({
  top: z.number().min(1).max(100).default(10).describe('Top N trending pools'),
  network: z.string().optional().describe('Filter theo network: solana | eth | bsc | base | arbitrum | polygon | ...'),
  sort: z.enum(['trending', 'volume']).default('trending').describe('trending = organic trending, volume = top by 24h volume'),
});

export type Input = z.infer<typeof schema>;

function pct(val: string | undefined): string {
  if (!val) return '—';
  const n = parseFloat(val);
  const s = n.toFixed(2) + '%';
  return n >= 0 ? `+${s}` : s;
}

function usdShort(val: string | number | undefined): string {
  if (val === undefined || val === null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(4)}`;
}

function formatPool(pool: GeckoPool, tokenMap: Map<string, GeckoToken>, rank: number) {
  const a = pool.attributes;
  const baseTokenId = pool.relationships.base_token.data.id;
  const baseToken = tokenMap.get(baseTokenId);
  const network = pool.relationships.network.data.id;
  const dex = pool.relationships.dex.data.id;

  const txH24 = a.transactions.h24;
  const totalTxH24 = txH24 ? txH24.buys + txH24.sells : undefined;

  return {
    rank,
    network,
    dex,
    pool_name: a.name,
    pool_address: a.address,
    base_token: {
      symbol: baseToken?.attributes.symbol ?? a.name.split(' / ')[0] ?? '—',
      name: baseToken?.attributes.name ?? '—',
      address: baseToken?.attributes.address ?? '—',
      coingecko_id: baseToken?.attributes.coingecko_coin_id,
    },
    price_usd: a.base_token_price_usd ? `$${parseFloat(a.base_token_price_usd).toPrecision(6)}` : '—',
    price_change: {
      m5: pct(a.price_change_percentage.m5),
      h1: pct(a.price_change_percentage.h1),
      h6: pct(a.price_change_percentage.h6),
      h24: pct(a.price_change_percentage.h24),
    },
    volume_h24: usdShort(a.volume_usd.h24),
    volume_h1: usdShort(a.volume_usd.h1),
    liquidity_usd: usdShort(a.reserve_in_usd),
    market_cap: usdShort(a.market_cap_usd ?? a.fdv_usd),
    txns_h24: totalTxH24 !== undefined ? `${totalTxH24} (${txH24!.buys}B / ${txH24!.sells}S)` : '—',
    pool_created_at: a.pool_created_at ?? '—',
    geckoterminal_url: `https://www.geckoterminal.com/${network}/pools/${a.address}`,
  };
}

export async function run(input: Input) {
  let pools, tokens;

  if (input.sort === 'volume') {
    const network = input.network ?? 'solana';
    ({ pools, tokens } = await gecko.getTopPoolsByVolume(network));
  } else if (input.network) {
    ({ pools, tokens } = await gecko.getTrendingPoolsByNetwork(input.network));
  } else {
    ({ pools, tokens } = await gecko.getTrendingPools());
  }

  const tokenMap = gecko.buildTokenMap(tokens);
  const top = pools.slice(0, input.top);

  return {
    source: 'geckoterminal',
    mode: input.sort,
    network: input.network ?? 'all',
    count: top.length,
    trending_pools: top.map((p, i) => formatPool(p, tokenMap, i + 1)),
  };
}
