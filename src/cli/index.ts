#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

import * as getMarketsSkill from '../skills/get_markets.js';
import * as scanHotSkill from '../skills/scan_hot.js';
import * as getOddsSkill from '../skills/get_odds.js';
import * as getOrderbookSkill from '../skills/get_orderbook.js';
import * as getPriceHistorySkill from '../skills/get_price_history.js';
import * as getWhalesSkill from '../skills/get_whales.js';
import * as searchMarketsSkill from '../skills/search_markets.js';
import * as alertSkill from '../skills/alert.js';
import type { AlertResult } from '../skills/alert.js';

import {
  printMarkets,
  printOdds,
  printOrderbook,
  printPriceHistory,
  printWhales,
  printSearch,
} from './display.js';

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('poly')
  .description('Polymarket CLI — prediction market data từ terminal')
  .version('1.0.0');

// ─── markets ──────────────────────────────────────────────────────────────────
program
  .command('markets')
  .description('Danh sách prediction markets')
  .option('-l, --limit <n>', 'Số markets', '20')
  .option('-t, --tag <tag>', 'Filter theo tag (crypto, politics, sports...)')
  .option('-o, --order <field>', 'Sort theo: volume | liquidity | startDate | endDate', 'volume')
  .option('--all', 'Bao gồm cả markets đã đóng')
  .action(async (opts) => {
    const result = await run(() =>
      getMarketsSkill.run({
        limit: parseInt(opts.limit),
        active: !opts.all,
        tag: opts.tag,
        order: opts.order,
      })
    );
    printMarkets(result.markets, `Markets (${result.count})`);
  });

// ─── hot ──────────────────────────────────────────────────────────────────────
program
  .command('hot')
  .description('Top hot markets đang trending theo volume')
  .option('-n, --top <n>', 'Top N markets', '10')
  .option('-c, --category <cat>', 'Category: all | crypto | politics | sports | finance', 'all')
  .action(async (opts) => {
    const result = await run(() =>
      scanHotSkill.run({
        top: parseInt(opts.top),
        category: opts.category,
      })
    );
    printMarkets(result.hot_markets, `🔥 Hot Markets — ${result.category} (top ${result.count})`);
  });

// ─── odds ─────────────────────────────────────────────────────────────────────
program
  .command('odds <slug_or_id>')
  .description('Xem odds hiện tại của 1 market')
  .option('--id', 'Dùng market ID thay vì slug')
  .action(async (slugOrId, opts) => {
    const result = await run(() =>
      getOddsSkill.run(
        opts.id
          ? { market_id: slugOrId }
          : { market_slug: slugOrId }
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printOdds(result as any);
  });

// ─── orderbook ────────────────────────────────────────────────────────────────
program
  .command('orderbook <slug_or_token>')
  .description('Xem orderbook depth của 1 market')
  .option('-d, --depth <n>', 'Số levels bids/asks', '5')
  .option('--token', 'Input là token ID thay vì market slug')
  .action(async (slugOrToken, opts) => {
    const result = await run(() =>
      getOrderbookSkill.run(
        opts.token
          ? { token_id: slugOrToken, depth: parseInt(opts.depth) }
          : { market_slug: slugOrToken, depth: parseInt(opts.depth) }
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printOrderbook(result as any);
  });

// ─── history ──────────────────────────────────────────────────────────────────
program
  .command('history <slug>')
  .description('Lịch sử giá của 1 market')
  .option('-i, --interval <i>', 'Interval: 1m | 1h | 1d | 1w | all', '1d')
  .option('-p, --points <n>', 'Số data points', '30')
  .action(async (slug, opts) => {
    const result = await run(() =>
      getPriceHistorySkill.run({
        market_slug: slug,
        interval: opts.interval,
        points: parseInt(opts.points),
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printPriceHistory(result as any);
  });

// ─── whales ───────────────────────────────────────────────────────────────────
program
  .command('whales <slug>')
  .description('Top whale holders của 1 market')
  .option('-n, --top <n>', 'Top N whales', '10')
  .action(async (slug, opts) => {
    const result = await run(() =>
      getWhalesSkill.run({
        market_slug: slug,
        top: parseInt(opts.top),
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printWhales(result as any);
  });

// ─── search ───────────────────────────────────────────────────────────────────
program
  .command('search <query>')
  .description('Tìm kiếm prediction markets theo từ khóa')
  .option('-l, --limit <n>', 'Số kết quả', '5')
  .action(async (query, opts) => {
    const result = await run(() =>
      searchMarketsSkill.run({
        query,
        limit: parseInt(opts.limit),
        active_only: true,
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printSearch(result as any);
  });

// ─── alert ────────────────────────────────────────────────────────────────────
program
  .command('alert <slug>')
  .description('Real-time alert khi odds vượt/xuống ngưỡng')
  .option('--above <n>', 'Alert khi YES probability vượt N% (vd: 70)')
  .option('--below <n>', 'Alert khi YES probability xuống dưới N% (vd: 30)')
  .option('--once', 'Dừng sau lần alert đầu tiên')
  .action(async (slug, opts) => {
    if (!opts.above && !opts.below) {
      console.error(chalk.red('Cần ít nhất --above hoặc --below'));
      process.exit(1);
    }

    const above = opts.above ? parseFloat(opts.above) / 100 : undefined;
    const below = opts.below ? parseFloat(opts.below) / 100 : undefined;

    console.log(chalk.bold.blue('\nAlert Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white(`Market: ${slug}`));
    if (above !== undefined) console.log(chalk.green(`▲ Alert when YES ≥ ${(above * 100).toFixed(1)}%`));
    if (below !== undefined) console.log(chalk.red(`▼ Alert when YES ≤ ${(below * 100).toFixed(1)}%`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    let stop: (() => void) | null = null;

    function onAlert(result: AlertResult) {
      const icon = result.condition === 'above' ? chalk.green('▲ ABOVE') : chalk.red('▼ BELOW');
      const pct = (result.current_price * 100).toFixed(1);
      const threshold = (result.threshold * 100).toFixed(1);
      console.log(chalk.bold(`\n🔔 ALERT TRIGGERED — ${icon}`));
      console.log(chalk.white(result.question));
      console.log(`   YES probability: ${chalk.bold(pct + '%')} (threshold: ${threshold}%)`);
      console.log(chalk.gray(`   Time: ${new Date(result.timestamp).toLocaleString()}`));
      if (opts.once && stop) {
        stop();
        process.exit(0);
      }
    }

    try {
      stop = await alertSkill.runInteractive(
        { market_slug: slug, above, below, once: !!opts.once },
        onAlert
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log(chalk.gray('\nStopped.'));
      stop?.();
      process.exit(0);
    });
  });

program.parse();
