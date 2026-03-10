import { z } from 'zod';
import chalk from 'chalk';
import { gamma } from '../api/index.js';
import { subscribe } from '../api/ws.js';
import type { PolyEvent, BestBidAskEvent, LastTradePriceEvent } from '../api/ws.js';

export const schema = z.object({
  market_slug: z.string().describe('Slug của market cần theo dõi'),
  above: z.number().min(0).max(1).optional().describe('Alert khi YES probability vượt ngưỡng này (0-1, vd: 0.7)'),
  below: z.number().min(0).max(1).optional().describe('Alert khi YES probability xuống dưới ngưỡng này (0-1, vd: 0.3)'),
  once: z.boolean().default(false).describe('Chỉ alert 1 lần rồi dừng'),
}).refine(d => d.above !== undefined || d.below !== undefined, {
  message: 'Cần ít nhất 1 trong: above hoặc below',
});

export type Input = z.infer<typeof schema>;

export interface AlertResult {
  triggered: boolean;
  condition: string;
  current_price: number;
  threshold: number;
  token_id: string;
  question: string;
  timestamp: string;
}

// ─── Interactive alert (dùng cho CLI) ────────────────────────────────────────

export async function runInteractive(input: Input, onAlert: (result: AlertResult) => void): Promise<() => void> {
  const markets = await gamma.getMarketBySlug(input.market_slug);
  const market = markets[0];
  if (!market) throw new Error(`Market not found: ${input.market_slug}`);

  const tokenIds = JSON.parse(market.clobTokenIds) as string[];
  const yesTokenId = tokenIds[0];
  if (!yesTokenId) throw new Error('No YES token found');

  let alertedAbove = false;
  let alertedBelow = false;

  function handleEvent(event: PolyEvent) {
    let currentPrice: number | null = null;

    if (event.event_type === 'best_bid_ask') {
      const e = event as BestBidAskEvent;
      if (e.asset_id !== yesTokenId) return;
      // mid = (bid + ask) / 2
      currentPrice = (parseFloat(e.best_bid) + parseFloat(e.best_ask)) / 2;
    } else if (event.event_type === 'last_trade_price') {
      const e = event as LastTradePriceEvent;
      if (e.asset_id !== yesTokenId) return;
      currentPrice = parseFloat(e.price);
    }

    if (currentPrice === null) return;

    // Check above threshold
    if (input.above !== undefined && currentPrice >= input.above) {
      if (!alertedAbove) {
        alertedAbove = true;
        onAlert({
          triggered: true,
          condition: 'above',
          current_price: currentPrice,
          threshold: input.above,
          token_id: yesTokenId,
          question: market.question,
          timestamp: new Date().toISOString(),
        });
        if (input.once) stop();
      }
    } else {
      alertedAbove = false; // reset nếu giá xuống lại
    }

    // Check below threshold
    if (input.below !== undefined && currentPrice <= input.below) {
      if (!alertedBelow) {
        alertedBelow = true;
        onAlert({
          triggered: true,
          condition: 'below',
          current_price: currentPrice,
          threshold: input.below,
          token_id: yesTokenId,
          question: market.question,
          timestamp: new Date().toISOString(),
        });
        if (input.once) stop();
      }
    } else {
      alertedBelow = false;
    }
  }

  const stop = subscribe({
    tokenIds: [yesTokenId],
    onEvent: handleEvent,
    onConnect: () => {
      console.log(chalk.gray(`Connected. Watching YES token ${yesTokenId.slice(0, 10)}...`));
    },
    onDisconnect: () => {
      console.log(chalk.gray('Disconnected. Reconnecting...'));
    },
    onError: (err) => {
      console.error(chalk.red(`WS Error: ${err.message}`));
    },
  });

  return stop;
}
