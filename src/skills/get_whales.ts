import { z } from 'zod';
import { gamma, data } from '../api/index.js';

export const schema = z.object({
  market_slug: z.string().optional().describe('Slug của market'),
  condition_id: z.string().optional().describe('Condition ID trực tiếp'),
  top: z.number().min(1).max(50).default(10).describe('Top N whale holders'),
}).refine(d => d.market_slug || d.condition_id, {
  message: 'Cần market_slug hoặc condition_id',
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  let conditionId = input.condition_id;
  let question = '';

  if (!conditionId && input.market_slug) {
    const markets = await gamma.getMarketBySlug(input.market_slug);
    const market = markets[0];
    if (!market) throw new Error('Market not found');
    question = market.question;
    conditionId = market.conditionId;
  }

  if (!conditionId) throw new Error('No condition ID');

  const [whales, openInterest] = await Promise.allSettled([
    data.getTopWhales(conditionId, input.top),
    data.getOpenInterest(conditionId),
  ]);

  const whaleList = whales.status === 'fulfilled' ? whales.value : [];
  const oi = openInterest.status === 'fulfilled' ? openInterest.value : null;

  const totalSize = whaleList.reduce((s, w) => s + parseFloat(w.size), 0);

  return {
    question,
    condition_id: conditionId,
    open_interest: oi ? { asset: oi.asset, value: oi.openInterest } : null,
    top_holders: whaleList.map((w, i) => ({
      rank: i + 1,
      wallet: `${w.proxyWallet.slice(0, 6)}...${w.proxyWallet.slice(-4)}`,
      full_wallet: w.proxyWallet,
      outcome: w.outcome,
      size: parseFloat(w.size).toFixed(2),
      share_of_top: totalSize > 0 ? `${((parseFloat(w.size) / totalSize) * 100).toFixed(1)}%` : 'N/A',
    })),
  };
}
