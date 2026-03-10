import { z } from 'zod';
import { gamma } from '../api/index.js';
import type { Market } from '../api/types.js';

export const schema = z.object({
  top: z.number().min(1).max(50).default(10).describe('Top N hot markets'),
  category: z.enum(['all', 'crypto', 'politics', 'sports', 'finance', 'science', 'pop-culture']).default('all').describe('Category filter'),
});

export type Input = z.infer<typeof schema>;

function formatHot(m: Market, rank: number) {
  const prices = JSON.parse(m.outcomePrices) as number[];
  const outcomes = JSON.parse(m.outcomes) as string[];
  const yesPrice = prices[0] ?? 0;
  return {
    rank,
    question: m.question,
    slug: m.slug,
    volume_usd: Number(m.volume).toFixed(2),
    liquidity_usd: Number(m.liquidity).toFixed(2),
    yes_probability: `${(yesPrice * 100).toFixed(1)}%`,
    odds: outcomes.map((o, i) => `${o}: ${(prices[i]! * 100).toFixed(1)}%`).join(' | '),
    end_date: m.endDate,
  };
}

export async function run(input: Input) {
  const tag = input.category === 'all' ? undefined : input.category;
  const markets = await gamma.getMarkets({
    active: true,
    closed: false,
    limit: 200,
    order: 'volume',
    ascending: false,
    tag,
  });
  const top = markets.slice(0, input.top);
  return {
    category: input.category,
    count: top.length,
    hot_markets: top.map((m, i) => formatHot(m, i + 1)),
  };
}
