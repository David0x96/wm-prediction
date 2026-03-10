import { z } from 'zod';
import { gamma, clob } from '../api/index.js';

export const schema = z.object({
  market_slug: z.string().optional().describe('Slug của market'),
  token_id: z.string().optional().describe('Token ID trực tiếp'),
  interval: z.enum(['1m', '1h', '1d', '1w', 'all']).default('1d').describe('Khung thời gian'),
  points: z.number().min(5).max(200).default(20).describe('Số data points trả về'),
}).refine(d => d.market_slug || d.token_id, {
  message: 'Cần market_slug hoặc token_id',
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  let tokenId = input.token_id;
  let question = '';

  if (!tokenId && input.market_slug) {
    const markets = await gamma.getMarketBySlug(input.market_slug);
    const market = markets[0];
    if (!market) throw new Error('Market not found');
    question = market.question;
    const ids = JSON.parse(market.clobTokenIds) as string[];
    tokenId = ids[0];
  }

  if (!tokenId) throw new Error('No token ID');

  const history = await clob.getPriceHistory(tokenId, input.interval);
  const allPoints = history.history;

  // Lấy N points cuối đều nhau
  const step = Math.max(1, Math.floor(allPoints.length / input.points));
  const sampled = allPoints.filter((_, i) => i % step === 0).slice(-input.points);

  const prices = sampled.map(p => parseFloat(p.p.toString()));
  const first = prices[0] ?? 0;
  const last = prices[prices.length - 1] ?? 0;
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const change = first > 0 ? (((last - first) / first) * 100).toFixed(2) : '0';

  return {
    question,
    token_id: tokenId,
    interval: input.interval,
    summary: {
      current: `${(last * 100).toFixed(1)}%`,
      change_pct: `${change}%`,
      high: `${(high * 100).toFixed(1)}%`,
      low: `${(low * 100).toFixed(1)}%`,
      data_points: sampled.length,
    },
    history: sampled.map(p => ({
      time: new Date(p.t * 1000).toISOString(),
      probability: `${(parseFloat(p.p.toString()) * 100).toFixed(1)}%`,
    })),
  };
}
