import type { Position, Trade, MarketHolder, OpenInterest, Leaderboard } from './types.js';

const BASE_URL = 'https://data-api.polymarket.com';

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Data API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(
  user: string,
  params: { limit?: number; offset?: number; sizeThreshold?: string } = {}
): Promise<Position[]> {
  const query: Record<string, string | number> = { user };
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  if (params.sizeThreshold !== undefined) query['sizeThreshold'] = params.sizeThreshold;
  return get<Position[]>('/positions', query);
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function getTrades(
  params: {
    user?: string;
    market?: string;
    limit?: number;
    offset?: number;
    before?: string;
    after?: string;
  } = {}
): Promise<Trade[]> {
  const query: Record<string, string | number> = {};
  if (params.user) query['user'] = params.user;
  if (params.market) query['market'] = params.market;
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  if (params.before) query['before'] = params.before;
  if (params.after) query['after'] = params.after;
  return get<Trade[]>('/trades', query);
}

// ─── Market Holders (Whale tracking) ─────────────────────────────────────────

export async function getMarketHolders(
  conditionId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<MarketHolder[]> {
  const query: Record<string, string | number> = { condition_id: conditionId };
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  return get<MarketHolder[]>('/market-positions', query);
}

// Top N whales trong 1 market
export async function getTopWhales(conditionId: string, top = 10): Promise<MarketHolder[]> {
  const holders = await getMarketHolders(conditionId, { limit: 100 });
  return holders
    .sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
    .slice(0, top);
}

// ─── Open Interest ────────────────────────────────────────────────────────────

export async function getOpenInterest(conditionId: string): Promise<OpenInterest> {
  return get<OpenInterest>('/open-interest', { condition_id: conditionId });
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(
  params: { limit?: number; offset?: number; window?: 'daily' | 'weekly' | 'monthly' | 'all' } = {}
): Promise<Leaderboard> {
  const query: Record<string, string | number> = {};
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  if (params.window) query['window'] = params.window;
  return get<Leaderboard>('/leaderboard', query);
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function getUserActivity(
  user: string,
  params: { limit?: number; offset?: number } = {}
): Promise<unknown[]> {
  const query: Record<string, string | number> = { user };
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  return get<unknown[]>('/activity', query);
}
