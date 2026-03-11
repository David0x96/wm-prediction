import type { GeckoPool, GeckoToken, GeckoPoolsResponse } from './types.js';

const BASE_URL = 'https://api.geckoterminal.com/api/v2';
const HEADERS = { Accept: 'application/json;version=20230302' };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GeckoTerminal API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Trending Pools ───────────────────────────────────────────────────────────

/** Top trending pools across all networks (organic, dựa trên tx + volume) */
export async function getTrendingPools(page = 1): Promise<{ pools: GeckoPool[]; tokens: GeckoToken[] }> {
  const data = await get<GeckoPoolsResponse>(
    `/networks/trending_pools?include=base_token,quote_token,dex&page=${page}`
  );
  return {
    pools: data.data,
    tokens: (data.included ?? []).filter(i => i.type === 'token') as GeckoToken[],
  };
}

/** Trending pools theo 1 network cụ thể (vd: solana, eth, bsc, base, arbitrum) */
export async function getTrendingPoolsByNetwork(
  network: string,
  page = 1,
): Promise<{ pools: GeckoPool[]; tokens: GeckoToken[] }> {
  const data = await get<GeckoPoolsResponse>(
    `/networks/${network}/trending_pools?include=base_token,quote_token,dex&page=${page}`
  );
  return {
    pools: data.data,
    tokens: (data.included ?? []).filter(i => i.type === 'token') as GeckoToken[],
  };
}

// ─── Top Pools by Volume ──────────────────────────────────────────────────────

/** Top pools theo volume 24h trên 1 network */
export async function getTopPoolsByVolume(
  network: string,
  page = 1,
): Promise<{ pools: GeckoPool[]; tokens: GeckoToken[] }> {
  const data = await get<GeckoPoolsResponse>(
    `/networks/${network}/pools?include=base_token,quote_token,dex&sort=h24_volume_usd_liquidity_desc&page=${page}`
  );
  return {
    pools: data.data,
    tokens: (data.included ?? []).filter(i => i.type === 'token') as GeckoToken[],
  };
}

// ─── New Pools ────────────────────────────────────────────────────────────────

/** Pools mới tạo gần đây trên 1 network */
export async function getNewPools(
  network: string,
  page = 1,
): Promise<{ pools: GeckoPool[]; tokens: GeckoToken[] }> {
  const data = await get<GeckoPoolsResponse>(
    `/networks/${network}/new_pools?include=base_token,quote_token,dex&page=${page}`
  );
  return {
    pools: data.data,
    tokens: (data.included ?? []).filter(i => i.type === 'token') as GeckoToken[],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build token map từ included array để lookup nhanh */
export function buildTokenMap(tokens: GeckoToken[]): Map<string, GeckoToken> {
  const map = new Map<string, GeckoToken>();
  for (const t of tokens) map.set(t.id, t);
  return map;
}

/** Extract network id từ pool relationship */
export function getNetworkFromPool(pool: GeckoPool): string {
  return pool.relationships.network.data.id;
}

/** Extract dex id từ pool relationship */
export function getDexFromPool(pool: GeckoPool): string {
  return pool.relationships.dex.data.id;
}
