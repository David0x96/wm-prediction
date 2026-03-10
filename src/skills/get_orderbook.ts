import { z } from 'zod';
import { gamma, clob } from '../api/index.js';

export const schema = z.object({
  token_id: z.string().optional().describe('Token ID trực tiếp'),
  market_slug: z.string().optional().describe('Slug của market — tự động lấy YES token'),
  depth: z.number().min(1).max(20).default(5).describe('Số levels bids/asks hiển thị'),
}).refine(d => d.token_id || d.market_slug, {
  message: 'Cần token_id hoặc market_slug',
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
    tokenId = ids[0]; // YES token
  }

  if (!tokenId) throw new Error('No token ID');

  const book = await clob.getOrderBook(tokenId);
  const bids = book.bids.slice(0, input.depth);
  const asks = book.asks.slice(0, input.depth);

  const totalBidSize = bids.reduce((s, b) => s + parseFloat(b.size), 0);
  const totalAskSize = asks.reduce((s, a) => s + parseFloat(a.size), 0);
  const bestBid = bids[0]?.price ?? 'N/A';
  const bestAsk = asks[0]?.price ?? 'N/A';
  const spread = bids[0] && asks[0]
    ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4)
    : 'N/A';

  return {
    question,
    token_id: tokenId,
    timestamp: book.timestamp,
    summary: {
      best_bid: bestBid,
      best_ask: bestAsk,
      spread,
      total_bid_liquidity: totalBidSize.toFixed(2),
      total_ask_liquidity: totalAskSize.toFixed(2),
    },
    bids: bids.map(b => ({ price: b.price, size: b.size })),
    asks: asks.map(a => ({ price: a.price, size: a.size })),
  };
}
