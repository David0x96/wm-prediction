import { z } from 'zod';
import { gamma } from '../api/index.js';
import type { Market } from '../api/types.js';

export const schema = z.object({
  limit: z.number().min(1).max(100).default(20).describe('Số lượng markets trả về'),
  active: z.boolean().default(true).describe('Chỉ lấy markets đang active'),
  tag: z.string().optional().describe('Filter theo tag (vd: "crypto", "politics", "sports")'),
  order: z.enum(['volume', 'liquidity', 'startDate', 'endDate']).default('volume').describe('Sắp xếp theo'),
});

export type Input = z.infer<typeof schema>;

function formatMarket(m: Market) {
  const prices = JSON.parse(m.outcomePrices) as number[];
  const outcomes = JSON.parse(m.outcomes) as string[];
  return {
    id: m.id,
    question: m.question,
    slug: m.slug,
    volume_usd: Number(m.volume).toFixed(2),
    liquidity_usd: Number(m.liquidity).toFixed(2),
    odds: outcomes.map((o, i) => ({ outcome: o, probability: `${(prices[i]! * 100).toFixed(1)}%` })),
    end_date: m.endDate,
    token_ids: m.clobTokenIds ? JSON.parse(m.clobTokenIds) as string[] : [],
  };
}

export async function run(input: Input) {
  const markets = await gamma.getMarkets({
    active: input.active,
    closed: false,
    limit: input.limit,
    order: input.order,
    ascending: false,
    tag: input.tag,
  });
  return {
    count: markets.length,
    markets: markets.map(formatMarket),
  };
}
