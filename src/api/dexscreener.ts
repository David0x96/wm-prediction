import type { DexToken, DexPair, DexBoostToken } from './types.js';

const BASE_URL = 'https://api.dexscreener.com';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`DexScreener API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Boosted / Trending tokens ────────────────────────────────────────────────

/** Top tokens theo tổng boost amount (trending nhất trên DexScreener) */
export async function getTopBoostedTokens(): Promise<DexBoostToken[]> {
  return get<DexBoostToken[]>('/token-boosts/top/v1');
}

/** Tokens đang active boost hiện tại */
export async function getActiveBoostedTokens(): Promise<DexBoostToken[]> {
  return get<DexBoostToken[]>('/token-boosts/active/v1');
}

// ─── Token pair data ──────────────────────────────────────────────────────────

interface TokenResponse {
  schemaVersion: string;
  pairs: DexPair[] | null;
}

/** Lấy pair data cho 1 hoặc nhiều token address (tối đa 30 address, cách nhau dấu phẩy) */
export async function getTokenPairs(addresses: string): Promise<DexPair[]> {
  const data = await get<TokenResponse>(`/latest/dex/tokens/${addresses}`);
  return data.pairs ?? [];
}

// ─── Search ───────────────────────────────────────────────────────────────────

interface SearchResponse {
  schemaVersion: string;
  pairs: DexPair[] | null;
}

export async function searchPairs(query: string): Promise<DexPair[]> {
  const data = await get<SearchResponse>(`/latest/dex/search?q=${encodeURIComponent(query)}`);
  return data.pairs ?? [];
}

// ─── Composite: Hot tokens với pair data ─────────────────────────────────────

export interface HotTokenWithData extends DexBoostToken {
  pair?: DexPair;
}

/**
 * Lấy top N boosted tokens + enrich với pair data (giá, volume, price change)
 * Chỉ lấy pair tốt nhất theo volume cho mỗi token.
 */
export async function getHotTokensWithData(
  limit = 10,
  chainId?: string,
): Promise<HotTokenWithData[]> {
  const boosts = await getTopBoostedTokens();

  let filtered = boosts;
  if (chainId) {
    filtered = boosts.filter(b => b.chainId.toLowerCase() === chainId.toLowerCase());
  }
  const top = filtered.slice(0, Math.min(limit, 30));

  if (top.length === 0) return [];

  // Fetch pair data theo từng chain để gom địa chỉ
  const byChain = new Map<string, DexBoostToken[]>();
  for (const b of top) {
    const arr = byChain.get(b.chainId) ?? [];
    arr.push(b);
    byChain.set(b.chainId, arr);
  }

  const pairMap = new Map<string, DexPair>(); // key: tokenAddress lowercase

  await Promise.all(
    [...byChain.entries()].map(async ([, tokens]) => {
      const addresses = tokens.map(t => t.tokenAddress).join(',');
      try {
        const pairs = await getTokenPairs(addresses);
        for (const pair of pairs) {
          const addr = pair.baseToken.address.toLowerCase();
          // Chọn pair có volume h24 cao nhất cho mỗi token
          const existing = pairMap.get(addr);
          const vol = pair.volume?.h24 ?? 0;
          const existingVol = existing?.volume?.h24 ?? 0;
          if (vol > existingVol) pairMap.set(addr, pair);
        }
      } catch {
        // Bỏ qua lỗi fetch pair, vẫn trả về boost data
      }
    })
  );

  return top.map(b => ({
    ...b,
    pair: pairMap.get(b.tokenAddress.toLowerCase()),
  }));
}
