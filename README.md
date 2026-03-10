# polymarket-mcp

CLI + MCP server để đọc dữ liệu Polymarket từ terminal và AI agent.

```
poly hot --top 10
poly odds will-solana-reach-120-in-march-2026
poly alert will-bitcoin-hit-1m-before-gta-vi-872 --above 60
```

---

## Cài đặt

```bash
npm install
```

**Yêu cầu:** Node.js 18+

---

## CLI

Chạy lệnh bằng `npm run poly -- <command>`.

### `poly hot`

Top markets đang trending theo volume.

```bash
npm run poly -- hot
npm run poly -- hot --top 20
npm run poly -- hot --category crypto
```

| Option           | Default | Mô tả                                                                                  |
| ---------------- | ------- | -------------------------------------------------------------------------------------- |
| `-n, --top <n>`  | `10`    | Số markets                                                                             |
| `-c, --category` | `all`   | `all` \| `crypto` \| `politics` \| `sports` \| `finance` \| `science` \| `pop-culture` |

---

### `poly markets`

Danh sách markets với filter và sort.

```bash
npm run poly -- markets
npm run poly -- markets --limit 30 --tag crypto
npm run poly -- markets --order liquidity
```

| Option                | Default  | Mô tả                                               |
| --------------------- | -------- | --------------------------------------------------- |
| `-l, --limit <n>`     | `20`     | Số markets                                          |
| `-t, --tag <tag>`     | —        | Filter theo tag                                     |
| `-o, --order <field>` | `volume` | `volume` \| `liquidity` \| `startDate` \| `endDate` |
| `--all`               | —        | Bao gồm cả markets đã đóng                          |

---

### `poly odds <slug>`

Odds YES/NO hiện tại: bid, ask, spread.

```bash
npm run poly -- odds will-solana-reach-120-in-march-2026
npm run poly -- odds <market-id> --id
```

**Lấy slug:** Dùng `poly hot` hoặc `poly search`, copy cột slug.

| Option | Mô tả                           |
| ------ | ------------------------------- |
| `--id` | Input là market ID thay vì slug |

---

### `poly orderbook <slug>`

Depth bids/asks của YES token.

```bash
npm run poly -- orderbook will-solana-reach-120-in-march-2026
npm run poly -- orderbook will-solana-reach-120-in-march-2026 --depth 10
npm run poly -- orderbook <token-id> --token
```

| Option            | Default | Mô tả                       |
| ----------------- | ------- | --------------------------- |
| `-d, --depth <n>` | `5`     | Số levels bids/asks         |
| `--token`         | —       | Input là token ID trực tiếp |

---

### `poly history <slug>`

Lịch sử giá theo thời gian + sparkline chart.

```bash
npm run poly -- history will-solana-reach-120-in-march-2026
npm run poly -- history will-solana-reach-120-in-march-2026 --interval 1h
npm run poly -- history will-solana-reach-120-in-march-2026 --interval 1w --points 50
```

| Option               | Default | Mô tả                                 |
| -------------------- | ------- | ------------------------------------- |
| `-i, --interval <i>` | `1d`    | `1m` \| `1h` \| `1d` \| `1w` \| `all` |
| `-p, --points <n>`   | `30`    | Số data points hiển thị               |

---

### `poly whales <slug>`

Top whale holders và họ đang bet vào outcome nào.

```bash
npm run poly -- whales will-bitcoin-hit-1m-before-gta-vi-872
npm run poly -- whales will-bitcoin-hit-1m-before-gta-vi-872 --top 20
```

| Option          | Default | Mô tả     |
| --------------- | ------- | --------- |
| `-n, --top <n>` | `10`    | Số whales |

---

### `poly search <query>`

Tìm market theo từ khóa.

```bash
npm run poly -- search "bitcoin"
npm run poly -- search "trump 2028" --limit 10
```

| Option            | Default | Mô tả      |
| ----------------- | ------- | ---------- |
| `-l, --limit <n>` | `5`     | Số kết quả |

---

### `poly alert <slug>`

Real-time alert khi odds vượt/xuống ngưỡng. Dùng WebSocket, tự reconnect khi mất kết nối.

```bash
# Alert khi YES vượt 70%
npm run poly -- alert will-bitcoin-hit-1m-before-gta-vi-872 --above 70

# Alert khi YES xuống dưới 30%
npm run poly -- alert will-bitcoin-hit-1m-before-gta-vi-872 --below 30

# Alert cả hai chiều, dừng sau lần đầu trigger
npm run poly -- alert will-bitcoin-hit-1m-before-gta-vi-872 --above 70 --below 30 --once

# Ctrl+C để dừng
```

| Option        | Mô tả                          |
| ------------- | ------------------------------ |
| `--above <n>` | Alert khi YES probability ≥ N% |
| `--below <n>` | Alert khi YES probability ≤ N% |
| `--once`      | Dừng sau lần alert đầu tiên    |

> Cần ít nhất `--above` hoặc `--below`.

---

## MCP Server

Expose tất cả skills dưới dạng MCP tools để AI agent (Claude) gọi được.

### Chạy server

```bash
npm run server
```

### Kết nối vào Claude Desktop

Thêm vào `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "polymarket": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/vandao2k/Documents/my-skill/polymarket-mcp/src/server.ts"
      ]
    }
  }
}
```

Restart Claude Desktop. Sau đó Claude có thể dùng các tools sau:

| Tool                | Mô tả                          |
| ------------------- | ------------------------------ |
| `get_markets`       | List markets, filter tag, sort |
| `scan_hot_markets`  | Top trending theo volume       |
| `get_odds`          | Odds YES/NO + bid/ask/spread   |
| `get_orderbook`     | Depth bids/asks                |
| `get_price_history` | Lịch sử giá theo interval      |
| `get_whales`        | Top whale holders              |
| `search_markets`    | Tìm kiếm theo keyword          |
| `watch_market`      | Snapshot giá + check threshold |

### Kết nối vào Cursor / Claude Code

Thêm vào `.cursor/mcp.json` hoặc `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "polymarket": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/vandao2k/Documents/my-skill/polymarket-mcp/src/server.ts"
      ]
    }
  }
}
```

---

## Cấu trúc project

```
polymarket-mcp/
├── src/
│   ├── api/
│   │   ├── gamma.ts         # Market data, events, search
│   │   ├── clob.ts          # Orderbook, prices, history
│   │   ├── data.ts          # Positions, trades, whales
│   │   ├── ws.ts            # WebSocket client (real-time)
│   │   ├── types.ts         # TypeScript types
│   │   └── index.ts         # Re-exports
│   ├── skills/
│   │   ├── get_markets.ts
│   │   ├── scan_hot.ts
│   │   ├── get_odds.ts
│   │   ├── get_orderbook.ts
│   │   ├── get_price_history.ts
│   │   ├── get_whales.ts
│   │   ├── search_markets.ts
│   │   └── alert.ts
│   ├── cli/
│   │   ├── index.ts         # CLI entry, 8 commands
│   │   └── display.ts       # Colored output helpers
│   └── server.ts            # MCP server entry
├── package.json
└── tsconfig.json
```

---

## API Sources

| API                      | Base URL                                               | Auth        |
| ------------------------ | ------------------------------------------------------ | ----------- |
| Gamma (market data)      | `https://gamma-api.polymarket.com`                     | None        |
| CLOB (orderbook, prices) | `https://clob.polymarket.com`                          | None (read) |
| Data (positions, trades) | `https://data-api.polymarket.com`                      | None        |
| WebSocket                | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | None        |

Tất cả read endpoints đều public — không cần API key.

---

## Scripts

| Script                  | Lệnh       | Mô tả                         |
| ----------------------- | ---------- | ----------------------------- |
| `npm run poly -- <cmd>` | CLI        | Chạy CLI command              |
| `npm run server`        | MCP server | Start MCP server (stdio)      |
| `npm run dev`           | Test       | Chạy test nhanh với live data |
| `npm run build`         | Build      | Compile TypeScript sang dist/ |
