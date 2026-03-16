import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import * as getMarkets from './skills/get_markets.js';
import * as scanHot from './skills/scan_hot.js';
import * as getOdds from './skills/get_odds.js';
import * as getOrderbook from './skills/get_orderbook.js';
import * as getPriceHistory from './skills/get_price_history.js';
import * as getWhales from './skills/get_whales.js';
import * as searchMarkets from './skills/search_markets.js';
import * as alert from './skills/alert.js';
import * as dexHot from './skills/dex_hot.js';
import * as geckoTrending from './skills/gecko_trending.js';
import * as walletInfo from './skills/wallet_info.js';
import * as polySetup from './skills/poly_setup.js';
import * as polyBet from './skills/poly_bet.js';
import * as polyOrders from './skills/poly_orders.js';
import * as dexSwap from './skills/dex_swap.js';
import * as polyPortfolio from './skills/poly_portfolio.js';
import * as polyApprove from './skills/poly_approve.js';
import * as walletCreate from './skills/wallet_create.js';
import * as walletFromMnemonic from './skills/wallet_from_mnemonic.js';
import * as walletSave from './skills/wallet_save.js';
import * as telegramTest from './skills/telegram_test.js';

const server = new McpServer({
  name: 'polymarket-mcp',
  version: '1.0.0',
});

// ─── Tool: get_markets ────────────────────────────────────────────────────────
server.tool(
  'get_markets',
  'Lấy danh sách prediction markets từ Polymarket. Filter theo tag, sort theo volume/liquidity.',
  getMarkets.schema.shape,
  async (input) => {
    const result = await getMarkets.run(getMarkets.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: scan_hot ───────────────────────────────────────────────────────────
server.tool(
  'scan_hot_markets',
  'Scan top hot markets đang trending trên Polymarket theo volume. Hữu ích để tìm markets đang được trade nhiều nhất.',
  scanHot.schema.shape,
  async (input) => {
    const result = await scanHot.run(scanHot.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_odds ───────────────────────────────────────────────────────────
server.tool(
  'get_odds',
  'Lấy odds/xác suất hiện tại của 1 prediction market. Trả về bid, ask, mid price cho YES và NO.',
  getOdds.schema.shape,
  async (input) => {
    const result = await getOdds.run(getOdds.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_orderbook ──────────────────────────────────────────────────────
server.tool(
  'get_orderbook',
  'Xem orderbook (bids/asks) của 1 market. Hiển thị depth, spread, và tổng liquidity.',
  getOrderbook.schema.shape,
  async (input) => {
    const result = await getOrderbook.run(getOrderbook.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_price_history ──────────────────────────────────────────────────
server.tool(
  'get_price_history',
  'Lấy lịch sử giá/xác suất của 1 market theo thời gian. Hỗ trợ interval: 1m, 1h, 1d, 1w, all.',
  getPriceHistory.schema.shape,
  async (input) => {
    const result = await getPriceHistory.run(getPriceHistory.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_whales ─────────────────────────────────────────────────────────
server.tool(
  'get_whales',
  'Xem top whale holders của 1 market — ai đang hold nhiều nhất và họ đang bet vào outcome nào.',
  getWhales.schema.shape,
  async (input) => {
    const result = await getWhales.run(getWhales.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: search_markets ─────────────────────────────────────────────────────
server.tool(
  'search_markets',
  'Tìm kiếm prediction markets theo từ khóa. Trả về danh sách markets phù hợp với odds hiện tại.',
  searchMarkets.schema.shape,
  async (input) => {
    const result = await searchMarkets.run(searchMarkets.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: watch_market ───────────────────────────────────────────────────────
server.tool(
  'watch_market',
  'Subscribe real-time vào 1 market và trả về snapshot giá hiện tại. Dùng để check live odds nhanh.',
  alert.schema.shape,
  async (input) => {
    const parsed = alert.schema.parse(input);
    // Trong MCP context, trả về snapshot thay vì stream dài hạn
    const { gamma, clob } = await import('./api/index.js');
    const markets = await gamma.getMarketBySlug(parsed.market_slug);
    const market = markets[0];
    if (!market) throw new Error(`Market not found: ${parsed.market_slug}`);
    const tokenIds = JSON.parse(market.clobTokenIds) as string[];
    const yesTokenId = tokenIds[0];
    if (!yesTokenId) throw new Error('No YES token');
    const price = await clob.getMarketPrice(yesTokenId);
    const currentYes = parseFloat(price.mid);
    const alerts: string[] = [];
    if (parsed.above !== undefined)
      alerts.push(`above ${(parsed.above * 100).toFixed(1)}%: ${currentYes >= parsed.above ? '✅ TRIGGERED' : `not yet (current ${(currentYes * 100).toFixed(1)}%)`}`);
    if (parsed.below !== undefined)
      alerts.push(`below ${(parsed.below * 100).toFixed(1)}%: ${currentYes <= parsed.below ? '✅ TRIGGERED' : `not yet (current ${(currentYes * 100).toFixed(1)}%)`}`);
    return {
      content: [{
        type: 'text', text: JSON.stringify({
          question: market.question,
          current_yes_probability: `${(currentYes * 100).toFixed(1)}%`,
          bid: price.bid,
          ask: price.ask,
          alert_conditions: alerts,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: get_dex_hot_tokens ─────────────────────────────────────────────────
server.tool(
  'get_dex_hot_tokens',
  'Lấy top hot tokens đang trending trên DexScreener theo boost amount. Trả về giá, volume 24h, price change, liquidity cho mỗi token.',
  dexHot.schema.shape,
  async (input) => {
    const result = await dexHot.run(dexHot.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: wallet_create ──────────────────────────────────────────────────────
server.tool(
  'wallet_create',
  'Tạo ví EVM mới với seed phrase (BIP39) và private key. Trả về address, mnemonic, private key. Dùng wallet_save để lưu vào .env.',
  walletCreate.schema.shape,
  async (input) => {
    const result = await walletCreate.run(walletCreate.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: wallet_from_mnemonic ───────────────────────────────────────────────
server.tool(
  'wallet_from_mnemonic',
  'Import ví từ seed phrase (12 hoặc 24 từ). Trả về address và private key. Hỗ trợ chọn account index để lấy ví phụ.',
  walletFromMnemonic.schema.shape,
  async (input) => {
    const result = await walletFromMnemonic.run(walletFromMnemonic.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: wallet_save ────────────────────────────────────────────────────────
server.tool(
  'wallet_save',
  'Lưu private key vào file .env tự động. Ghi đè PRIVATE_KEY cũ nếu đã có.',
  walletSave.schema.shape,
  async (input) => {
    const result = await walletSave.run(walletSave.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: wallet_info ────────────────────────────────────────────────────────
server.tool(
  'wallet_info',
  'Xem địa chỉ ví và balance (native token + USDC) trên chain được chọn. Cần PRIVATE_KEY trong .env.',
  walletInfo.schema.shape,
  async (input) => {
    const result = await walletInfo.run(walletInfo.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: poly_setup ─────────────────────────────────────────────────────────
server.tool(
  'poly_setup',
  'Tạo Polymarket API key từ ví (chạy 1 lần). Cần PRIVATE_KEY trong .env. Trả về key/secret/passphrase để lưu vào .env.',
  polySetup.schema.shape,
  async (input) => {
    const result = await polySetup.run(polySetup.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: poly_bet ───────────────────────────────────────────────────────────
server.tool(
  'poly_bet',
  'Đặt lệnh mua/bán trên Polymarket. Cần PRIVATE_KEY + POLY_API_KEY/SECRET/PASSPHRASE trong .env.',
  polyBet.schema.shape,
  async (input) => {
    const result = await polyBet.run(polyBet.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: poly_orders ────────────────────────────────────────────────────────
server.tool(
  'poly_orders',
  'Quản lý lệnh Polymarket: xem lệnh đang mở, hủy 1 lệnh, hoặc hủy tất cả. Cần API credentials trong .env.',
  polyOrders.schema.shape,
  async (input) => {
    const result = await polyOrders.run(polyOrders.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_gecko_trending ─────────────────────────────────────────────────
server.tool(
  'get_gecko_trending',
  'Lấy top trending pools organic trên GeckoTerminal (dựa trên volume + transaction thực, không phải paid boost). Filter theo network, sort theo trending hoặc volume 24h.',
  geckoTrending.schema.shape,
  async (input) => {
    const result = await geckoTrending.run(geckoTrending.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: dex_swap ───────────────────────────────────────────────────────────
server.tool(
  'dex_swap',
  'Swap token trên DEX (QuickSwap/Uniswap V2/PancakeSwap/BaseSwap/SushiSwap). Cần PRIVATE_KEY trong .env. Dùng "NATIVE" cho native token (ETH/MATIC/BNB), "USDC" cho stablecoin.',
  dexSwap.schema.shape,
  async (input) => {
    const result = await dexSwap.run(dexSwap.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: poly_portfolio ─────────────────────────────────────────────────────
server.tool(
  'poly_portfolio',
  'Xem positions hiện tại và PnL trên Polymarket. Có thể xem của bất kỳ địa chỉ ví nào, hoặc mặc định dùng ví trong .env.',
  polyPortfolio.schema.shape,
  async (input) => {
    const result = await polyPortfolio.run(polyPortfolio.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: poly_approve ───────────────────────────────────────────────────────
server.tool(
  'poly_approve',
  'Check hoặc approve USDC cho Polymarket CTF Exchange contracts. Bắt buộc phải approve trước khi đặt lệnh lần đầu.',
  polyApprove.schema.shape,
  async (input) => {
    const result = await polyApprove.run(polyApprove.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: telegram_test ──────────────────────────────────────────────────────
server.tool(
  'telegram_test',
  'Test kết nối Telegram Bot — gửi tin nhắn thử để xác nhận TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID đang hoạt động.',
  telegramTest.schema.shape,
  async (input) => {
    const result = await telegramTest.run(telegramTest.schema.parse(input));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Polymarket MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
