/**
 * Polymarket Order Building + EIP-712 Signing
 * Ref: https://github.com/Polymarket/py-clob-client
 */
import type { EVMWallet } from '../wallet/index.js';
import { CHAIN_ID } from './auth.js';

// ─── CTF Exchange contracts (Polygon) ────────────────────────────────────────

export const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as const;
export const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a' as const;

// ─── EIP-712 types ────────────────────────────────────────────────────────────

const ORDER_TYPES = {
  Order: [
    { name: 'salt',          type: 'uint256' },
    { name: 'maker',         type: 'address' },
    { name: 'signer',        type: 'address' },
    { name: 'taker',         type: 'address' },
    { name: 'tokenId',       type: 'uint256' },
    { name: 'makerAmount',   type: 'uint256' },
    { name: 'takerAmount',   type: 'uint256' },
    { name: 'expiration',    type: 'uint256' },
    { name: 'nonce',         type: 'uint256' },
    { name: 'feeRateBps',    type: 'uint256' },
    { name: 'side',          type: 'uint8'   },
    { name: 'signatureType', type: 'uint8'   },
  ],
} as const;

export enum Side { BUY = 0, SELL = 1 }
export enum SignatureType { EOA = 0, POLY_PROXY = 2 }

// ─── Order params ─────────────────────────────────────────────────────────────

export interface BuildOrderParams {
  /** token_id của outcome (YES hoặc NO token từ clobTokenIds) */
  tokenId: string;
  /** BUY = mua YES/NO, SELL = bán */
  side: 'BUY' | 'SELL';
  /** Giá (0-1), ví dụ 0.65 = 65 cents */
  price: number;
  /** Số USDC muốn dùng (BUY) hoặc số token muốn bán (SELL) */
  amount: number;
  /** Unix timestamp hết hạn lệnh (0 = không hết hạn) */
  expiration?: number;
  /** true nếu market dùng Neg Risk exchange */
  negRisk?: boolean;
  /** fee tính bằng bps, mặc định 0 */
  feeRateBps?: number;
}

export interface SignedOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number;
  signatureType: number;
  signature: string;
}

// ─── Build + sign order ───────────────────────────────────────────────────────

const USDC_DECIMALS = 6;
const TOKEN_DECIMALS = 6; // CTF outcome tokens cũng dùng 6 decimals

function toUnits(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * 10 ** decimals));
}

export async function buildAndSignOrder(
  wallet: EVMWallet,
  params: BuildOrderParams,
): Promise<SignedOrder> {
  const exchange = params.negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE;
  const salt = BigInt(Math.floor(Math.random() * 1e15));
  const side = params.side === 'BUY' ? Side.BUY : Side.SELL;
  const expiration = BigInt(params.expiration ?? 0);
  const feeRateBps = BigInt(params.feeRateBps ?? 0);

  // BUY: maker bỏ USDC, nhận outcome token
  // SELL: maker bỏ outcome token, nhận USDC
  let makerAmount: bigint;
  let takerAmount: bigint;

  if (side === Side.BUY) {
    // amount = USDC muốn bỏ ra
    makerAmount = toUnits(params.amount, USDC_DECIMALS);
    // takerAmount = outcome tokens nhận được = amount / price
    takerAmount = toUnits(params.amount / params.price, TOKEN_DECIMALS);
  } else {
    // amount = outcome tokens muốn bán
    makerAmount = toUnits(params.amount, TOKEN_DECIMALS);
    // takerAmount = USDC nhận được = amount * price
    takerAmount = toUnits(params.amount * params.price, USDC_DECIMALS);
  }

  const orderMessage = {
    salt,
    maker: wallet.address,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    tokenId: BigInt(params.tokenId),
    makerAmount,
    takerAmount,
    expiration,
    nonce: 0n,
    feeRateBps,
    side,
    signatureType: SignatureType.EOA,
  };

  const signature = await wallet.signTypedData({
    domain: {
      name: 'Polymarket CTF Exchange',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: exchange,
    },
    types: ORDER_TYPES,
    primaryType: 'Order',
    message: orderMessage,
  });

  return {
    salt: salt.toString(),
    maker: wallet.address,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: params.tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration: expiration.toString(),
    nonce: '0',
    feeRateBps: feeRateBps.toString(),
    side,
    signatureType: SignatureType.EOA,
    signature,
  };
}
