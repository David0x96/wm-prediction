import { z } from 'zod';
import { gamma } from '../api/index.js';

export const schema = z.object({
  query: z.string().min(2).describe('Từ khóa tìm kiếm (vd: "bitcoin", "trump", "election")'),
  limit: z.number().min(1).max(20).default(5).describe('Số kết quả trả về'),
  active_only: z.boolean().default(true).describe('Chỉ tìm markets đang active'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const results = await gamma.searchMarkets(input.query, input.limit);
  const filtered = input.active_only ? results.filter(m => m.active) : results;

  return {
    query: input.query,
    count: filtered.length,
    markets: filtered.map(m => {
      const prices = JSON.parse(m.outcomePrices) as number[];
      const outcomes = JSON.parse(m.outcomes) as string[];
      return {
        id: m.id,
        question: m.question,
        slug: m.slug,
        volume_usd: Number(m.volume).toFixed(2),
        liquidity_usd: Number(m.liquidity).toFixed(2),
        odds: outcomes.map((o, i) => `${o}: ${(prices[i]! * 100).toFixed(1)}%`).join(' | '),
        end_date: m.endDate,
        active: m.active,
        token_ids: m.clobTokenIds ? JSON.parse(m.clobTokenIds) as string[] : [],
      };
    }),
  };
}
