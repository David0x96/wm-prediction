import type { OrderBook, MarketPrice, PriceHistory, TokenPrice } from './types.js';

const BASE_URL = 'https://clob.polymarket.com';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`CLOB API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Orderbook ────────────────────────────────────────────────────────────────

export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  return get<OrderBook>('/book', { token_id: tokenId });
}

// ─── Prices ───────────────────────────────────────────────────────────────────

export async function getPrice(tokenId: string, side: 'BUY' | 'SELL'): Promise<string> {
  const result = await get<{ price: string }>('/price', { token_id: tokenId, side });
  return result.price;
}

export async function getMidpoint(tokenId: string): Promise<string> {
  const result = await get<{ mid: string }>('/midpoint', { token_id: tokenId });
  return result.mid;
}

export async function getSpread(tokenId: string): Promise<string> {
  const result = await get<{ spread: string }>('/spread', { token_id: tokenId });
  return result.spread;
}

// Lấy full thông tin giá (bid, ask, mid, spread, last trade)
export async function getMarketPrice(tokenId: string): Promise<MarketPrice> {
  const [bid, ask, mid, spread] = await Promise.all([
    getPrice(tokenId, 'BUY'),
    getPrice(tokenId, 'SELL'),
    getMidpoint(tokenId),
    getSpread(tokenId),
  ]);
  return {
    token_id: tokenId,
    price: mid,
    bid,
    ask,
    mid,
    spread,
  };
}

// Lấy giá nhiều tokens cùng lúc
export async function getPrices(tokenIds: string[]): Promise<TokenPrice[]> {
  const result = await get<{ prices: TokenPrice[] }>('/prices', {
    token_ids_csv: tokenIds.join(','),
  });
  return result.prices ?? [];
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function getPriceHistory(
  tokenId: string,
  interval?: '1m' | '1h' | '1d' | '1w' | 'all',
  fidelity?: number
): Promise<PriceHistory> {
  const params: Record<string, string> = { market: tokenId };
  if (interval) params['interval'] = interval;
  if (fidelity !== undefined) params['fidelity'] = String(fidelity);
  return get<PriceHistory>('/prices-history', params);
}

// ─── Last Trade ───────────────────────────────────────────────────────────────

export async function getLastTradePrice(tokenId: string): Promise<string> {
  const result = await get<{ price: string }>('/last-trade-price', { token_id: tokenId });
  return result.price;
}

// ─── Tick Size ────────────────────────────────────────────────────────────────

export async function getMarketInfo(conditionId: string): Promise<{ minimum_tick_size: string; neg_risk: boolean }> {
  return get(`/markets/${conditionId}`);
}
