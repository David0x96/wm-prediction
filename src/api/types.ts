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
