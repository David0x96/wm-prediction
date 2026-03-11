// ─── Gamma API Types ──────────────────────────────────────────────────────────

export interface Market {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  outcomePrices: string; // JSON string "[0.7, 0.3]"
  outcomes: string;      // JSON string '["Yes","No"]'
  clobTokenIds: string;  // JSON string "[tokenIdYes, tokenIdNo]"
  category?: string;
  eventId?: string;
  description?: string;
  resolvedBy?: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  markets: Market[];
  category?: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  label: string;
  slug: string;
}

export interface MarketQueryParams {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
  tag?: string;
  relatedTags?: boolean;
}

// ─── CLOB API Types ───────────────────────────────────────────────────────────

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  hash: string;
  timestamp: string;
}

export interface TokenPrice {
  token_id: string;
  price: string;
}

export interface MarketPrice {
  token_id: string;
  price: string;
  bid: string;
  ask: string;
  mid: string;
  spread: string;
  last_trade_price?: string;
}

export interface PriceHistoryPoint {
  t: number;  // timestamp
  p: number;  // price
}

export interface PriceHistory {
  history: PriceHistoryPoint[];
}

// ─── Data API Types ───────────────────────────────────────────────────────────

export interface Position {
  proxyWallet: string;
  asset: string;
  size: string;
  avgPrice: string;
  initialValue: string;
  currentValue: string;
  cashPnl: string;
  percentPnl: string;
  totalBought: string;
  realizedPnl: string;
  market?: Market;
}

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  maker_orders?: MakerOrder[];
}

export interface MakerOrder {
  order_id: string;
  maker_address: string;
  matched_amount: string;
  fee: string;
}

export interface MarketHolder {
  proxyWallet: string;
  size: string;
  outcome: string;
}

export interface OpenInterest {
  asset: string;
  openInterest: string;
}

export interface Leaderboard {
  data: LeaderboardEntry[];
  pagination: Pagination;
}

export interface LeaderboardEntry {
  name: string;
  proxyWallet: string;
  pnl: string;
  volume: string;
  position: number;
}

export interface Pagination {
  next?: string;
  limit: number;
  count: number;
}

// ─── GeckoTerminal Types ──────────────────────────────────────────────────────

export interface GeckoPool {
  id: string;                     // e.g. "solana_So11..."
  type: string;                   // "pool"
  attributes: {
    name: string;                 // e.g. "WIF / SOL"
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    price_change_percentage: {
      m5?: string;
      h1?: string;
      h6?: string;
      h24?: string;
    };
    transactions: {
      m5?: { buys: number; sells: number; buyers: number; sellers: number };
      h1?: { buys: number; sells: number; buyers: number; sellers: number };
      h6?: { buys: number; sells: number; buyers: number; sellers: number };
      h24?: { buys: number; sells: number; buyers: number; sellers: number };
    };
    volume_usd: {
      m5?: string;
      h1?: string;
      h6?: string;
      h24?: string;
    };
    reserve_in_usd: string;       // liquidity
    fdv_usd?: string;
    market_cap_usd?: string;
    pool_created_at?: string;
  };
  relationships: {
    base_token: { data: { id: string; type: string } };
    quote_token: { data: { id: string; type: string } };
    dex: { data: { id: string; type: string } };
    network: { data: { id: string; type: string } };
  };
}

export interface GeckoToken {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    image_url?: string;
    coingecko_coin_id?: string;
  };
}

export interface GeckoPoolsResponse {
  data: GeckoPool[];
  included?: GeckoToken[];
}

// ─── DexScreener Types ────────────────────────────────────────────────────────

export interface DexBoostToken {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;       // boost amount hiện tại
  totalAmount: number;  // tổng boost đã mua
  icon?: string;
  header?: string;
  description?: string;
  links?: Array<{ type?: string; label?: string; url: string }>;
}

export interface DexToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexTransactions {
  buys: number;
  sells: number;
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexToken;
  quoteToken: DexToken;
  priceNative?: string;
  priceUsd?: string;
  txns?: {
    m5?: DexTransactions;
    h1?: DexTransactions;
    h6?: DexTransactions;
    h24?: DexTransactions;
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  boosts?: { active?: number };
}
