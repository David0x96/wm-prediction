import { z } from 'zod';
import { loadWallet } from '../wallet/index.js';
import { getOpenOrders, cancelOrder, cancelAllOrders, loadCredentials } from '../polymarket/client.js';

export const schema = z.object({
  action: z.enum(['list', 'cancel', 'cancel_all']).describe('list = xem lệnh mở, cancel = hủy 1 lệnh, cancel_all = hủy tất cả'),
  order_id: z.string().optional().describe('Order ID cần hủy (chỉ dùng khi action = cancel)'),
  market_id: z.string().optional().describe('Filter theo market condition ID (chỉ dùng với action = list)'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const wallet = loadWallet('polygon');
  const creds = loadCredentials();

  if (input.action === 'list') {
    const orders = await getOpenOrders(creds, wallet.address, input.market_id);
    return {
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        market: o.market,
        outcome: o.outcome,
        side: o.side,
        price: o.price,
        size_open: o.size_open,
        size_matched: o.size_matched,
        status: o.status,
        created_at: new Date(o.created_at * 1000).toISOString(),
      })),
    };
  }

  if (input.action === 'cancel') {
    if (!input.order_id) throw new Error('Cần cung cấp order_id khi action = cancel');
    const result = await cancelOrder(creds, wallet.address, input.order_id);
    return {
      canceled: result.canceled,
      failed: result.not_canceled,
    };
  }

  if (input.action === 'cancel_all') {
    const result = await cancelAllOrders(creds, wallet.address);
    return {
      canceled_count: result.canceled.length,
      canceled: result.canceled,
      failed: result.not_canceled,
    };
  }
}
