import chalk from 'chalk';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function probColor(pct: number): string {
  const s = `${pct.toFixed(1)}%`;
  if (pct >= 70) return chalk.green(s);
  if (pct >= 40) return chalk.yellow(s);
  return chalk.red(s);
}

function usd(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// Strip ANSI codes để đo độ dài thực
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}

function pad(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  const len = stripAnsi(s).length;
  const spaces = Math.max(0, width - len);
  return align === 'right' ? ' '.repeat(spaces) + s : s + ' '.repeat(spaces);
}

// ─── Generic table renderer ───────────────────────────────────────────────────

type Align = 'left' | 'right';

interface ColDef {
  header: string;
  align?: Align;
  width?: number;  // fixed width
  flex?: boolean;  // stretch to fill terminal width
}

function termWidth(): number {
  return process.stdout.columns ?? 120;
}

function table(cols: ColDef[], rows: string[][]): string {
  const tw = termWidth();
  // indent(2) + numCols * padding(2) + (numCols-1) borders
  const overhead = 2 + cols.length * 2 + (cols.length - 1);

  // 1. Resolve fixed widths first
  const widths: number[] = cols.map((c, i) => {
    if (c.flex) return 0; // placeholder
    const dataMax = rows.length > 0 ? Math.max(...rows.map(r => stripAnsi(r[i] ?? '').length)) : 0;
    return c.width ?? Math.max(stripAnsi(c.header).length, dataMax);
  });

  // 2. Flex cols share remaining space equally
  const flexIndices = cols.map((c, i) => c.flex ? i : -1).filter(i => i >= 0);
  if (flexIndices.length > 0) {
    const fixedTotal = widths.reduce((a, w) => a + w, 0);
    const remaining = Math.max(0, tw - overhead - fixedTotal);
    const share = Math.floor(remaining / flexIndices.length);
    for (const idx of flexIndices) {
      const minW = rows.length > 0
        ? Math.max(stripAnsi(cols[idx]!.header).length, ...rows.map(r => stripAnsi(r[idx] ?? '').length))
        : stripAnsi(cols[idx]!.header).length;
      widths[idx] = Math.max(minW, share);
    }
  }

  const border = chalk.gray('  ' + widths.map(w => '─'.repeat(w + 2)).join('┬'));
  const sep    = chalk.gray('  ' + widths.map(w => '─'.repeat(w + 2)).join('┼'));
  const bottom = chalk.gray('  ' + widths.map(w => '─'.repeat(w + 2)).join('┴'));

  const headerRow = '  ' + cols
    .map((c, i) => chalk.bold.gray(` ${pad(c.header, widths[i]!)} `))
    .join(chalk.gray('│'));

  const dataRows = rows.map(row =>
    '  ' + cols
      .map((c, i) => {
        const cell = row[i] ?? '';
        const w = widths[i]!;
        const stripped = stripAnsi(cell);
        // Truncate only flex columns to fit
        const display = (c.flex && stripped.length > w)
          ? cell.slice(0, Math.max(0, w - 1)) + chalk.gray('…')
          : cell;
        return ` ${pad(display, w, c.align ?? 'left')} `;
      })
      .join(chalk.gray('│'))
  );

  return [border, headerRow, sep, ...dataRows, bottom].join('\n');
}

// ─── Market list ──────────────────────────────────────────────────────────────

export interface MarketItem {
  rank?: number;
  question: string;
  slug: string;
  volume_usd: string;
  liquidity_usd: string;
  odds?: Array<{ outcome: string; probability: string }> | string;
  yes_probability?: string;
  end_date?: string;
}

function getYesNo(m: MarketItem): [string, string] {
  if (typeof m.odds === 'string') {
    const matches = [...m.odds.matchAll(/(\d+\.\d+)%/g)];
    const yes = parseFloat(matches[0]?.[1] ?? '0');
    const no  = parseFloat(matches[1]?.[1] ?? '0');
    return [probColor(yes), probColor(no)];
  }
  if (Array.isArray(m.odds) && m.odds.length >= 2) {
    const yes = parseFloat(m.odds[0]!.probability);
    const no  = parseFloat(m.odds[1]!.probability);
    return [probColor(yes), probColor(no)];
  }
  if (m.yes_probability) {
    const yes = parseFloat(m.yes_probability);
    return [probColor(yes), probColor(100 - yes)];
  }
  return [chalk.gray('—'), chalk.gray('—')];
}

export function printMarkets(markets: MarketItem[], title: string) {
  console.log(`\n${chalk.bold.blue(title)}`);
  console.log();

  const rows: string[][] = markets.map(m => {
    const [yes, no] = getYesNo(m);
    const rank = m.rank ? chalk.bold(`#${m.rank}`) : chalk.gray('•');
    return [
      rank,
      chalk.white(m.question),
      yes,
      no,
      chalk.cyan(usd(m.volume_usd)),
      chalk.cyan(usd(m.liquidity_usd)),
    ];
  });

  const cols: ColDef[] = [
    { header: '#',         width: 4 },
    { header: 'Question',  flex: true },
    { header: 'YES',       width: 7,  align: 'right' },
    { header: 'NO',        width: 7,  align: 'right' },
    { header: 'Volume',    width: 9,  align: 'right' },
    { header: 'Liquidity', width: 9,  align: 'right' },
  ];

  console.log(table(cols, rows));
}

// ─── Odds ─────────────────────────────────────────────────────────────────────

interface OddsResult {
  question: string;
  prices: Array<{
    outcome: string;
    token_id?: string;
    probability?: string;
    bid?: string;
    ask?: string;
    spread?: string;
    error?: string;
  }>;
}

export function printOdds(result: OddsResult) {
  console.log(`\n${chalk.bold.blue('Odds')}`);
  console.log(chalk.white(result.question));
  console.log();

  const rows: string[][] = result.prices.map(p => {
    if (p.error) return [chalk.gray(p.outcome), chalk.red('unavailable'), '—', '—', '—'];
    const pct = parseFloat(p.probability ?? '0');
    return [
      chalk.bold(p.outcome),
      probColor(pct),
      chalk.green(p.bid ?? '—'),
      chalk.red(p.ask ?? '—'),
      chalk.yellow(p.spread ?? '—'),
    ];
  });

  const cols: ColDef[] = [
    { header: 'Outcome', width: 8 },
    { header: 'Prob',    width: 7,  align: 'right' },
    { header: 'Bid',     width: 6,  align: 'right' },
    { header: 'Ask',     width: 6,  align: 'right' },
    { header: 'Spread',  flex: true, align: 'right' },
  ];

  console.log(table(cols, rows));
}

// ─── Orderbook ────────────────────────────────────────────────────────────────

interface OrderbookResult {
  question: string;
  token_id: string;
  timestamp: string;
  summary: {
    best_bid: string;
    best_ask: string;
    spread: string;
    total_bid_liquidity: string;
    total_ask_liquidity: string;
  };
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export function printOrderbook(result: OrderbookResult) {
  console.log(`\n${chalk.bold.blue('Orderbook')}`);
  if (result.question) console.log(chalk.white(result.question));
  console.log();

  const s = result.summary;
  // Summary row
  const summaryRows: string[][] = [[
    chalk.green(s.best_bid),
    chalk.red(s.best_ask),
    chalk.yellow(s.spread),
    chalk.cyan(usd(s.total_bid_liquidity)),
    chalk.cyan(usd(s.total_ask_liquidity)),
  ]];
  const summaryCols: ColDef[] = [
    { header: 'Best Bid', width: 9,   align: 'right' },
    { header: 'Best Ask', width: 9,   align: 'right' },
    { header: 'Spread',   width: 10,  align: 'right' },
    { header: 'Bid Liq',  flex: true, align: 'right' },
    { header: 'Ask Liq',  flex: true, align: 'right' },
  ];
  console.log(table(summaryCols, summaryRows));
  console.log();

  // Depth table: bids | asks
  const maxRows = Math.max(result.bids.length, result.asks.length);
  const depthRows: string[][] = [];
  for (let i = 0; i < maxRows; i++) {
    const b = result.bids[i];
    const a = result.asks[i];
    depthRows.push([
      b ? chalk.green(b.price) : '—',
      b ? chalk.white(parseFloat(b.size).toLocaleString()) : '—',
      a ? chalk.red(a.price) : '—',
      a ? chalk.white(parseFloat(a.size).toLocaleString()) : '—',
    ]);
  }
  const depthCols: ColDef[] = [
    { header: 'Bid Price', width: 10, align: 'right' },
    { header: 'Bid Size',  flex: true, align: 'right' },
    { header: 'Ask Price', width: 10, align: 'right' },
    { header: 'Ask Size',  flex: true, align: 'right' },
  ];
  console.log(table(depthCols, depthRows));
}

// ─── Price History ────────────────────────────────────────────────────────────

interface PriceHistoryResult {
  question: string;
  interval: string;
  summary: {
    current: string;
    change_pct: string;
    high: string;
    low: string;
  };
  history: Array<{ time: string; probability: string }>;
}

export function printPriceHistory(result: PriceHistoryResult) {
  console.log(`\n${chalk.bold.blue('Price History')} ${chalk.gray(`[${result.interval}]`)}`);
  if (result.question) console.log(chalk.white(result.question));
  console.log();

  const s = result.summary;
  const change = parseFloat(s.change_pct);
  const changeStr = change >= 0 ? chalk.green(`+${s.change_pct}`) : chalk.red(s.change_pct);

  // Summary
  const summaryRow: string[][] = [[chalk.bold(s.current), changeStr, chalk.green(s.high), chalk.red(s.low)]];
  const summaryCol: ColDef[] = [
    { header: 'Current', width: 8,  align: 'right' },
    { header: 'Change',  width: 10, align: 'right' },
    { header: 'High',    width: 8,  align: 'right' },
    { header: 'Low',     width: 8,  align: 'right' },
  ];
  console.log(table(summaryCol, summaryRow));
  console.log();

  // Sparkline
  const probs = result.history.map(h => parseFloat(h.probability));
  const min = Math.min(...probs);
  const max = Math.max(...probs);
  const range = max - min || 1;
  const barChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const spark = probs
    .map(p => {
      const level = Math.floor(((p - min) / range) * 7);
      const char = barChars[Math.min(level, 7)] ?? '▁';
      return p >= 50 ? chalk.green(char) : chalk.red(char);
    })
    .join('');
  console.log(`  ${spark}`);
  console.log(`  ${chalk.gray(result.history[0]?.time.slice(0, 10) ?? '')} → ${chalk.gray(result.history[result.history.length - 1]?.time.slice(0, 10) ?? '')}`);
  console.log();

  // History table
  const histRows: string[][] = result.history.map(h => {
    const pct = parseFloat(h.probability);
    return [chalk.gray(h.time.slice(0, 19).replace('T', ' ')), probColor(pct)];
  });
  const histCols: ColDef[] = [
    { header: 'Time',        width: 19 },
    { header: 'Probability', width: 11, align: 'right' },
  ];
  console.log(table(histCols, histRows));
}

// ─── Whales ───────────────────────────────────────────────────────────────────

interface WhalesResult {
  question: string;
  open_interest: { value: string } | null;
  top_holders: Array<{
    rank: number;
    wallet: string;
    outcome: string;
    size: string;
    share_of_top: string;
  }>;
}

export function printWhales(result: WhalesResult) {
  console.log(`\n${chalk.bold.blue('Whale Holders')}`);
  if (result.question) console.log(chalk.white(result.question));
  if (result.open_interest) console.log(chalk.gray(`Open Interest: ${result.open_interest.value}`));
  console.log();

  const rows: string[][] = result.top_holders.map(w => {
    const outcomeColor = w.outcome?.toLowerCase() === 'yes' ? chalk.green : chalk.red;
    return [
      chalk.bold(`#${w.rank}`),
      chalk.cyan(w.wallet),
      outcomeColor(w.outcome ?? '?'),
      chalk.cyan(usd(w.size)),
      chalk.gray(w.share_of_top),
    ];
  });

  const cols: ColDef[] = [
    { header: '#',       width: 4 },
    { header: 'Wallet',  flex: true },
    { header: 'Bet',     width: 5 },
    { header: 'Size',    width: 10, align: 'right' },
    { header: 'Share',   width: 7,  align: 'right' },
  ];

  console.log(table(cols, rows));
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function printSearch(result: { query: string; count: number; markets: MarketItem[] }) {
  printMarkets(result.markets, `Search: "${result.query}" — ${result.count} results`);
}

// ─── DexScreener Hot Tokens ───────────────────────────────────────────────────

export interface DexTokenItem {
  rank: number;
  chain: string;
  symbol: string;
  name: string;
  price_usd: string;
  price_change_h1: string;
  price_change_h24: string;
  volume_h24: string;
  liquidity_usd: string;
  market_cap: string;
  boost_total: number;
  dex: string;
}

function changeColor(val: string): string {
  if (val === '—') return chalk.gray(val);
  return val.startsWith('+') ? chalk.green(val) : chalk.red(val);
}

export function printDexHot(result: { chain: string; count: number; hot_tokens: DexTokenItem[] }) {
  const chainLabel = result.chain === 'all' ? 'All Chains' : result.chain;
  console.log(`\n${chalk.bold.magenta(`DexScreener Hot Tokens — ${chainLabel} (top ${result.count})`)}`);
  console.log();

  const rows: string[][] = result.hot_tokens.map(t => [
    chalk.bold(`#${t.rank}`),
    chalk.yellow(t.symbol),
    chalk.white(t.name),
    chalk.gray(t.chain),
    chalk.cyan(t.price_usd === '—' ? '—' : `$${t.price_usd}`),
    changeColor(t.price_change_h1),
    changeColor(t.price_change_h24),
    chalk.cyan(t.volume_h24),
    chalk.cyan(t.liquidity_usd),
    chalk.gray(String(t.boost_total)),
  ]);

  const cols: ColDef[] = [
    { header: '#',       width: 4 },
    { header: 'Symbol',  width: 10 },
    { header: 'Name',    flex: true },
    { header: 'Chain',   width: 10 },
    { header: 'Price',   width: 12, align: 'right' },
    { header: '1h%',     width: 8,  align: 'right' },
    { header: '24h%',    width: 9,  align: 'right' },
    { header: 'Vol 24h', width: 10, align: 'right' },
    { header: 'Liq',     width: 10, align: 'right' },
    { header: 'Boosts',  width: 7,  align: 'right' },
  ];

  console.log(table(cols, rows));
}
