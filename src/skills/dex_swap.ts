/**
 * DEX Swap skill — dùng router trực tiếp qua viem
 * Hỗ trợ: Uniswap V2-style (UniV2, PancakeSwap, QuickSwap, SushiSwap)
 *
 * Router addresses:
 *   polygon:  QuickSwap  0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
 *   ethereum: Uniswap V2 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
 *   bsc:      PancakeSwap 0x10ED43C718714eb63d5aA57B78B54704E256024E
 *   base:     BaseSwap   0x327Df1E6de05895d2ab08513aaDD9313Fe505d86
 *   arbitrum: SushiSwap  0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
 */
import { z } from 'zod';
import { parseUnits, formatUnits, type Address } from 'viem';
import { loadWallet, CHAINS, USDC_ADDRESS } from '../wallet/index.js';

export const schema = z.object({
  chain: z.string().default('polygon').describe(`Chain swap: ${Object.keys(CHAINS).join(' | ')}`),
  token_in: z.string().describe('Token muốn dùng để swap (địa chỉ 0x... hoặc "USDC" / "NATIVE")'),
  token_out: z.string().describe('Token muốn nhận (địa chỉ 0x... hoặc "USDC" / "NATIVE")'),
  amount_in: z.number().positive().describe('Số lượng token_in muốn swap'),
  slippage_pct: z.number().min(0.1).max(50).default(1).describe('Slippage tolerance (%), mặc định 1%'),
});

export type Input = z.infer<typeof schema>;

// ─── Router registry ──────────────────────────────────────────────────────────

const ROUTERS: Record<string, Address> = {
  polygon:  '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
  ethereum: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
  bsc:      '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
  base:     '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', // BaseSwap
  arbitrum: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
};

// Wrapped native token
const WNATIVE: Record<string, Address> = {
  polygon:  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  bsc:      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  base:     '0x4200000000000000000000000000000000000006', // WETH on Base
  arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arb
};

// ─── Uniswap V2 Router ABI (tối giản) ────────────────────────────────────────

const ROUTER_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'getAmountsOut',
    type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveToken(symbol: string, chain: string): Address {
  if (symbol === 'NATIVE') return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // sentinel
  if (symbol === 'USDC') return USDC_ADDRESS[chain]!;
  if (!symbol.startsWith('0x')) throw new Error(`Token không hợp lệ: ${symbol}. Dùng địa chỉ 0x..., "USDC", hoặc "NATIVE"`);
  return symbol as Address;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const NATIVE_SENTINEL = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export async function run(input: Input) {
  const wallet = loadWallet(input.chain);
  const router = ROUTERS[input.chain];
  const wnative = WNATIVE[input.chain];
  if (!router || !wnative) throw new Error(`Chain ${input.chain} chưa được hỗ trợ swap`);

  const tokenInAddr = resolveToken(input.token_in, input.chain);
  const tokenOutAddr = resolveToken(input.token_out, input.chain);
  const isNativeIn  = tokenInAddr === NATIVE_SENTINEL;
  const isNativeOut = tokenOutAddr === NATIVE_SENTINEL;

  // Build swap path
  const pathIn  = isNativeIn  ? wnative : tokenInAddr;
  const pathOut = isNativeOut ? wnative : tokenOutAddr;
  const path: Address[] = pathIn === pathOut ? [pathIn] : [pathIn, pathOut];

  // Token decimals — native = 18, USDC = 6, others query on-chain
  const TOKEN_DECIMAL_DEFAULTS: Record<string, number> = {
    [USDC_ADDRESS[input.chain] ?? '']: 6,
    [wnative]: 18,
  };
  const inDecimals = isNativeIn ? 18 : (TOKEN_DECIMAL_DEFAULTS[pathIn.toLowerCase()] ?? 18);
  const amountIn = parseUnits(String(input.amount_in), inDecimals);

  const publicClient = wallet.getPublicClient();

  // Quote amountOut
  const amounts = await publicClient.readContract({
    address: router,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountIn, path],
  }) as bigint[];

  const amountOut = amounts[amounts.length - 1]!;
  const outDecimals = isNativeOut ? 18 : (TOKEN_DECIMAL_DEFAULTS[pathOut.toLowerCase()] ?? 18);
  const amountOutMin = amountOut * BigInt(Math.floor((100 - input.slippage_pct) * 100)) / 10000n;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 phút
  const walletClient = wallet.getWalletClient();

  // Approve nếu token_in không phải native
  if (!isNativeIn) {
    const allowance = await wallet.getAllowance(pathIn, router);
    if (allowance < amountIn) {
      await wallet.approveToken(pathIn, router, String(input.amount_in * 10), inDecimals);
    }
  }

  // Simulate trước khi gửi
  let txHash: `0x${string}`;
  if (isNativeIn) {
    const { request } = await publicClient.simulateContract({
      address: router, abi: ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path, wallet.address, deadline],
      value: amountIn,
      account: wallet.account,
    });
    txHash = await walletClient.writeContract(request);
  } else if (isNativeOut) {
    const { request } = await publicClient.simulateContract({
      address: router, abi: ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path, wallet.address, deadline],
      account: wallet.account,
    });
    txHash = await walletClient.writeContract(request);
  } else {
    const { request } = await publicClient.simulateContract({
      address: router, abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, wallet.address, deadline],
      account: wallet.account,
    });
    txHash = await walletClient.writeContract(request);
  }

  const receipt = await wallet.waitForTx(txHash);

  return {
    success: receipt.status === 'success',
    tx_hash: txHash,
    chain: input.chain,
    swap: {
      token_in: input.token_in,
      amount_in: input.amount_in,
      token_out: input.token_out,
      amount_out_estimated: formatUnits(amountOut, outDecimals),
      amount_out_min: formatUnits(amountOutMin, outDecimals),
      slippage: `${input.slippage_pct}%`,
      router: router,
      dex: { polygon: 'QuickSwap', ethereum: 'Uniswap V2', bsc: 'PancakeSwap', base: 'BaseSwap', arbitrum: 'SushiSwap' }[input.chain] ?? 'Unknown',
    },
    gas_used: receipt.gasUsed.toString(),
  };
}
