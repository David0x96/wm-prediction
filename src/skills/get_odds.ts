import { z } from 'zod';
import { gamma, clob } from '../api/index.js';

export const schema = z.object({
  market_slug: z.string().optional().describe('Slug của market (vd: "will-solana-reach-120-in-march-2026")'),
  market_id: z.string().optional().describe('ID của market'),
  token_id: z.string().optional().describe('Token ID trực tiếp (YES token)'),
}).refine(d => d.market_slug || d.market_id || d.token_id, {
  message: 'Cần ít nhất 1 trong: market_slug, market_id, hoặc token_id',
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  let tokenIds: string[] = [];
  let question = '';
  let outcomes: string[] = [];

  if (input.token_id) {
    tokenIds = [input.token_id];
  } else {
    const markets = input.market_slug
      ? await gamma.getMarketBySlug(input.market_slug)
      : [await gamma.getMarketById(input.market_id!)];

    const market = markets[0];
    if (!market) throw new Error('Market not found');

    question = market.question;
    tokenIds = JSON.parse(market.clobTokenIds) as string[];
    outcomes = JSON.parse(market.outcomes) as string[];
  }

  // Lấy giá cả YES và NO tokens song song
  const priceResults = await Promise.allSettled(
    tokenIds.map(id => clob.getMarketPrice(id))
  );

  const prices = priceResults.map((r, i) => ({
    outcome: outcomes[i] ?? (i === 0 ? 'YES' : 'NO'),
    token_id: tokenIds[i],
    ...(r.status === 'fulfilled'
      ? {
          probability: `${(parseFloat(r.value.mid) * 100).toFixed(1)}%`,
          bid: r.value.bid,
          ask: r.value.ask,
          spread: r.value.spread,
        }
      : { error: 'Price unavailable' }),
  }));

  return { question, prices };
}
