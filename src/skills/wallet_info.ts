import { z } from 'zod';
import { loadWallet, CHAINS, USDC_ADDRESS } from '../wallet/index.js';
import type { Address } from 'viem';

export const schema = z.object({
  chain: z.string().default('polygon').describe(`Chain muốn check: ${Object.keys(CHAINS).join(' | ')}`),
  token_address: z.string().optional().describe('ERC-20 token address tuỳ chỉnh (optional, dạng 0x...)'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const wallet = loadWallet(input.chain);

  const [native, usdc] = await Promise.all([
    wallet.getNativeBalance(),
    USDC_ADDRESS[input.chain] ? wallet.getUSDCBalance() : Promise.resolve(null),
  ]);

  const balances: Record<string, string> = {
    [native.symbol]: native.balance,
    ...(usdc ? { [usdc.symbol]: usdc.balance } : {}),
  };

  if (input.token_address) {
    const tokenBal = await wallet.getTokenBalance(input.token_address as Address);
    balances[tokenBal.symbol] = tokenBal.balance;
  }

  return {
    address: wallet.address,
    chain: input.chain,
    chain_id: wallet.chain.id,
    balances,
  };
}
