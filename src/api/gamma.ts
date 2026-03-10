import type { Market, Event, Tag, MarketQueryParams } from './types.js';

const BASE_URL = 'https://gamma-api.polymarket.com';

async function get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Gamma API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export async function getMarkets(params: MarketQueryParams = {}): Promise<Market[]> {
  const query: Record<string, string | number | boolean> = {};
  if (params.active !== undefined) query['active'] = params.active;
  if (params.closed !== undefined) query['closed'] = params.closed;
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  if (params.order !== undefined) query['order'] = params.order;
  if (params.ascending !== undefined) query['ascending'] = params.ascending;
  if (params.tag !== undefined) query['tag'] = params.tag;
  if (params.relatedTags !== undefined) query['relatedTags'] = params.relatedTags;
  return get<Market[]>('/markets', query);
}

export async function getMarketById(id: string): Promise<Market> {
  return get<Market>(`/markets/${id}`);
}

export async function getMarketBySlug(slug: string): Promise<Market[]> {
  return get<Market[]>('/markets', { slug });
}

// ─── Hot runners — sort by volume, lấy top N active markets ──────────────────

export async function getHotMarkets(limit = 10): Promise<Market[]> {
  const markets = await getMarkets({ active: true, closed: false, limit: 100, order: 'volume', ascending: false });
  return markets.slice(0, limit);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(params: { active?: boolean; closed?: boolean; limit?: number; offset?: number } = {}): Promise<Event[]> {
  const query: Record<string, string | number | boolean> = {};
  if (params.active !== undefined) query['active'] = params.active;
  if (params.closed !== undefined) query['closed'] = params.closed;
  if (params.limit !== undefined) query['limit'] = params.limit;
  if (params.offset !== undefined) query['offset'] = params.offset;
  return get<Event[]>('/events', query);
}

export async function getEventById(id: string): Promise<Event> {
  return get<Event>(`/events/${id}`);
}

export async function getEventBySlug(slug: string): Promise<Event[]> {
  return get<Event[]>('/events', { slug });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  return get<Tag[]>('/tags');
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMarkets(query: string, limit = 10): Promise<Market[]> {
  const all = await getMarkets({ active: true, closed: false, limit: 500 });
  const q = query.toLowerCase();
  return all
    .filter(m => m.question.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q))
    .slice(0, limit);
}
