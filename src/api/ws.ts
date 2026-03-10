import WebSocket from 'ws';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

export interface PriceChangeEvent {
  event_type: 'price_change';
  asset_id: string;
  market: string;
  price: string;
  side: 'BUY' | 'SELL';
  size: string;
  hash: string;
  timestamp: string;
}

export interface BestBidAskEvent {
  event_type: 'best_bid_ask';
  asset_id: string;
  market: string;
  best_bid: string;
  best_ask: string;
  spread: string;
  timestamp: string;
}

export interface LastTradePriceEvent {
  event_type: 'last_trade_price';
  asset_id: string;
  market: string;
  price: string;
  timestamp: string;
}

export interface MarketResolvedEvent {
  event_type: 'market_resolved';
  condition_id: string;
  resolved_by: string;
  winning_outcome: string;
  timestamp: string;
}

export type PolyEvent = PriceChangeEvent | BestBidAskEvent | LastTradePriceEvent | MarketResolvedEvent;

export interface SubscribeOptions {
  tokenIds: string[];
  onEvent: (event: PolyEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (err: Error) => void;
  reconnect?: boolean;
}

export function subscribe(opts: SubscribeOptions): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      opts.onConnect?.();
      ws!.send(JSON.stringify({
        assets_ids: opts.tokenIds,
        type: 'market',
        custom_feature_enabled: true,
      }));
    });

    ws.on('message', (data) => {
      try {
        const raw = data.toString();
        // Polymarket gửi array hoặc single object
        const parsed = JSON.parse(raw) as PolyEvent | PolyEvent[];
        const events = Array.isArray(parsed) ? parsed : [parsed];
        for (const event of events) {
          if (event.event_type) opts.onEvent(event);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      opts.onError?.(err);
    });

    ws.on('close', () => {
      opts.onDisconnect?.();
      if (!stopped && opts.reconnect !== false) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    });
  }

  connect();

  // Trả về hàm stop
  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
