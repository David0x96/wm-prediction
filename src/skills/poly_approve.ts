/**
 * Approve USDC cho Polymarket CTF Exchange
 * Bước bắt buộc trước khi đặt lệnh lần đầu.
 *
 * Polymarket dùng proxy wallet — user cần approve USDC cho:
 *   CTF Exchange:          0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
 *   Neg Risk CTF Exchange: 0xC5d563A36AE78145C45a50134d48A1215220f80a
 */
import { z } from 'zod';
import { formatUnits, parseUnits, type Address } from 'viem';
import { loadWallet, USDC_ADDRESS } from '../wallet/index.js';
import { CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE } from '../polymarket/order.js';

const MAX_UINT256 = 2n ** 256n - 1n;

export const schema = z.object({
  action: z.enum(['check', 'approve']).default('check').describe(
    'check = xem allowance hiện tại, approve = approve USDC cho Polymarket contracts'
  ),
  amount_usdc: z.number().positive().optional().describe(
    'Số USDC approve (mặc định = unlimited). Chỉ dùng khi action = approve'
  ),
});

export type Input = z.infer<typeof schema>;

const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
] as const;

export async function run(input: Input) {
  const wallet = loadWallet('polygon');
  const usdc = USDC_ADDRESS['polygon']!;
  const publicClient = wallet.getPublicClient();
  const walletClient = wallet.getWalletClient();

  const spenders: { name: string; address: Address }[] = [
    { name: 'CTF Exchange',          address: CTF_EXCHANGE },
    { name: 'Neg Risk CTF Exchange', address: NEG_RISK_CTF_EXCHANGE },
  ];

  // Check allowances
  const allowances = await Promise.all(
    spenders.map(async s => {
      const raw = await publicClient.readContract({
        address: usdc, abi: ERC20_ABI, functionName: 'allowance',
        args: [wallet.address, s.address],
      }) as bigint;
      const formatted = raw === MAX_UINT256
        ? 'unlimited'
        : `$${formatUnits(raw, 6)} USDC`;
      return { name: s.name, address: s.address, allowance: formatted, raw };
    })
  );

  if (input.action === 'check') {
    return {
      wallet: wallet.address,
      usdc_contract: usdc,
      allowances: allowances.map(a => ({
        spender: a.name,
        address: a.address,
        allowance: a.allowance,
        approved: a.raw > 0n,
      })),
    };
  }

  // Approve
  const amount = input.amount_usdc
    ? parseUnits(String(input.amount_usdc), 6)
    : MAX_UINT256;

  const txHashes: string[] = [];
  for (const spender of spenders) {
    const { request } = await publicClient.simulateContract({
      address: usdc, abi: ERC20_ABI, functionName: 'approve',
      args: [spender.address, amount],
      account: wallet.account,
    });
    const hash = await walletClient.writeContract(request);
    await wallet.waitForTx(hash);
    txHashes.push(hash);
  }

  return {
    success: true,
    wallet: wallet.address,
    approved_amount: input.amount_usdc ? `$${input.amount_usdc} USDC` : 'unlimited',
    tx_hashes: {
      ctf_exchange: txHashes[0],
      neg_risk_ctf_exchange: txHashes[1],
    },
    message: 'USDC đã được approve. Giờ có thể dùng poly_bet để đặt lệnh.',
  };
}
