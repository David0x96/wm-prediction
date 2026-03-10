#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

import * as dexHotSkill from '../skills/dex_hot.js';

import { printDexHot } from './display.js';

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
  .name('dex')
  .description('DexScreener CLI — token data từ terminal')
  .version('1.0.0');

// ─── hot ──────────────────────────────────────────────────────────────────────
program
  .command('hot')
  .description('Top hot tokens đang trending trên DexScreener (theo boost)')
  .option('-n, --top <n>', 'Top N tokens', '10')
  .option('-c, --chain <chain>', 'Filter theo chain: solana | ethereum | bsc | base | ...')
  .action(async (opts) => {
    const result = await run(() =>
      dexHotSkill.run({
        top: parseInt(opts.top),
        chain: opts.chain,
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printDexHot(result as any);
  });

program.parse();
