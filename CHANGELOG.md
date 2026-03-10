# Changelog

## [Unreleased] — 2026-03-10

### Added
- **DexScreener integration** — lấy hot tokens từ DexScreener
  - `src/api/dexscreener.ts` — API client gọi DexScreener public API
    - `getTopBoostedTokens()` — top tokens theo tổng boost amount
    - `getActiveBoostedTokens()` — tokens đang active boost
    - `getTokenPairs(addresses)` — pair data (giá, volume, price change)
    - `searchPairs(query)` — search pairs theo keyword
    - `getHotTokensWithData(limit, chainId)` — composite: boost list + enrich pair data
  - `src/skills/dex_hot.ts` — skill `dex hot`, filter theo chain, top N
  - `src/cli/dex.ts` — CLI riêng cho DexScreener (`npm run dex -- hot`)
  - `src/cli/display.ts` — thêm `printDexHot()` với bảng màu

- **DexScreener types** (`src/api/types.ts`)
  - `DexBoostToken` — boost token data
  - `DexPair` — pair data (price, volume, liquidity, priceChange, txns)
  - `DexToken`, `DexTransactions`

- **MCP tool** `get_dex_hot_tokens` — expose skill cho AI agent

### Changed
- `package.json` — tách 2 scripts + bin riêng: `poly` (Polymarket) và `dex` (DexScreener)
- `src/api/index.ts` — export thêm namespace `dex`
- `src/cli/index.ts` — bỏ `dex-hot` command (chuyển sang `dex.ts`)

---

## [1.0.0] — initial

### Added
- **Polymarket CLI** (`npm run poly -- <command>`)
  - `hot` — top markets trending theo volume, filter theo category
  - `markets` — danh sách markets, filter tag, sort
  - `odds <slug>` — odds YES/NO (bid, ask, spread)
  - `orderbook <slug>` — depth bids/asks
  - `history <slug>` — lịch sử giá + sparkline chart
  - `whales <slug>` — top whale holders
  - `search <query>` — tìm kiếm market theo keyword
  - `alert <slug>` — real-time alert qua WebSocket

- **MCP Server** (`npm run server`) — 8 tools cho AI agent
  - `get_markets`, `scan_hot_markets`, `get_odds`, `get_orderbook`
  - `get_price_history`, `get_whales`, `search_markets`, `watch_market`

- **API clients**
  - `src/api/gamma.ts` — Gamma API (market data, events, search)
  - `src/api/clob.ts` — CLOB API (orderbook, prices, history)
  - `src/api/data.ts` — Data API (positions, trades, whales)
  - `src/api/ws.ts` — WebSocket client (real-time price alerts)
