import { z } from 'zod';
import { loadWallet } from '../wallet/index.js';
import { buildAndSignOrder } from '../polymarket/order.js';
import { placeOrder, loadCredentials } from '../polymarket/client.js';
import { gamma } from '../api/index.js';

export const schema = z.object({
  market_slug: z.string().describe('Slug của market trên Polymarket (vd: "will-btc-hit-100k-by-2025")'),
  outcome: z.enum(['YES', 'NO']).describe('Bet vào outcome nào'),
  side: z.enum(['BUY', 'SELL']).default('BUY').describe('BUY = mua, SELL = bán lại position đang có'),
  amount_usdc: z.number().positive().describe('Số USDC muốn dùng (BUY) hoặc số token muốn bán (SELL)'),
  price: z.number().min(0.01).max(0.99).optional().describe('Giá limit (0-1). Bỏ trống = dùng current mid price (market order)'),
  order_type: z.enum(['GTC', 'FOK']).default('GTC').describe('GTC = lệnh chờ, FOK = fill ngay hoặc hủy'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const wallet = loadWallet('polygon');
  const creds = loadCredentials();

  // Lấy market info
  const markets = await gamma.getMarketBySlug(input.market_slug);
  const market = markets[0];
  if (!market) throw new Error(`Market not found: ${input.market_slug}`);
  if (!market.active) throw new Error(`Market đã đóng: ${input.market_slug}`);

  // Lấy token IDs và giá hiện tại
  const tokenIds = JSON.parse(market.clobTokenIds) as string[];
  const outcomes = JSON.parse(market.outcomes) as string[];
  const prices = JSON.parse(market.outcomePrices) as number[];

  const outcomeIndex = outcomes.findIndex(o => o.toUpperCase() === input.outcome);
  if (outcomeIndex === -1) throw new Error(`Outcome "${input.outcome}" không tồn tại. Outcomes: ${outcomes.join(', ')}`);

  const tokenId = tokenIds[outcomeIndex];
  if (!tokenId) throw new Error('Token ID not found');

  const midPrice = prices[outcomeIndex] ?? 0.5;
  const price = input.price ?? midPrice;

  // Build + sign order
  const signedOrder = await buildAndSignOrder(wallet, {
    tokenId,
    side: input.side,
    price,
    amount: input.amount_usdc,
  });

  // Submit lên CLOB
  const result = await placeOrder(creds, wallet.address, signedOrder, input.order_type);

  return {
    success: result.success,
    order_id: result.orderID,
    error: result.errorMsg,
    details: {
      market: market.question,
      outcome: input.outcome,
      side: input.side,
      price_used: price,
      mid_price_at_order: midPrice,
      amount_usdc: input.amount_usdc,
      order_type: input.order_type,
      wallet: wallet.address,
    },
  };
}
