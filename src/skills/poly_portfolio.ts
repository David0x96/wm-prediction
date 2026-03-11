import { z } from 'zod';
import { loadWallet } from '../wallet/index.js';
import { data } from '../api/index.js';
import type { Position } from '../api/types.js';

export const schema = z.object({
  address: z.string().optional().describe('Địa chỉ ví muốn xem (mặc định = ví của mày trong .env)'),
  min_value: z.number().default(0.01).describe('Chỉ hiện positions có value >= X USDC'),
  include_trades: z.boolean().default(false).describe('Kèm theo lịch sử trades gần nhất'),
  trade_limit: z.number().min(1).max(100).default(20).describe('Số trades lấy nếu include_trades = true'),
});

export type Input = z.infer<typeof schema>;

function formatPosition(p: Position) {
  const size = parseFloat(p.size);
  const currentValue = parseFloat(p.currentValue);
  const cashPnl = parseFloat(p.cashPnl);
  const pctPnl = parseFloat(p.percentPnl);

  return {
    market: p.market?.question ?? p.asset,
    outcome: p.market ? (() => {
      try {
        const outcomes = JSON.parse(p.market.outcomes) as string[];
        const tokenIds = JSON.parse(p.market.clobTokenIds) as string[];
        const idx = tokenIds.indexOf(p.asset);
        return idx !== -1 ? outcomes[idx] : p.asset.slice(0, 10) + '…';
      } catch { return p.asset.slice(0, 10) + '…'; }
    })() : p.asset.slice(0, 10) + '…',
    shares: size.toFixed(2),
    avg_price: `$${parseFloat(p.avgPrice).toFixed(4)}`,
    current_value_usdc: `$${currentValue.toFixed(2)}`,
    pnl_usdc: `${cashPnl >= 0 ? '+' : ''}$${cashPnl.toFixed(2)}`,
    pnl_pct: `${pctPnl >= 0 ? '+' : ''}${pctPnl.toFixed(2)}%`,
    initial_investment: `$${parseFloat(p.initialValue).toFixed(2)}`,
    market_end: p.market?.endDate,
    active: p.market?.active ?? true,
  };
}

export async function run(input: Input) {
  let address = input.address;
  if (!address) {
    const wallet = loadWallet('polygon');
    address = wallet.address;
  }

  const positions = await data.getPositions(address, { limit: 100, sizeThreshold: '0.01' });
  const filtered = positions.filter(p => parseFloat(p.currentValue) >= input.min_value);
  const formatted = filtered.map(formatPosition);

  const totalValue = filtered.reduce((s, p) => s + parseFloat(p.currentValue), 0);
  const totalPnl = filtered.reduce((s, p) => s + parseFloat(p.cashPnl), 0);

  const result: Record<string, unknown> = {
    address,
    summary: {
      total_positions: formatted.length,
      total_value_usdc: `$${totalValue.toFixed(2)}`,
      total_pnl_usdc: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
    },
    positions: formatted,
  };

  if (input.include_trades) {
    const trades = await data.getTrades({ user: address, limit: input.trade_limit });
    result['recent_trades'] = trades.map(t => ({
      market: t.market,
      side: t.side,
      size: t.size,
      price: t.price,
      time: t.match_time,
    }));
  }

  return result;
}
