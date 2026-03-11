/**
 * Polymarket CLOB Authentication
 *
 * L1 auth: sign EIP-712 message với wallet để tạo API credentials
 * L2 auth: HMAC-SHA256 với API key/secret/passphrase cho mỗi request
 */
import { createHmac } from 'crypto';
import type { EVMWallet } from '../wallet/index.js';

export const CHAIN_ID = 137; // Polygon

// ─── L1 Auth (tạo API credentials từ wallet) ─────────────────────────────────

const L1_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: CHAIN_ID,
} as const;

const L1_TYPES = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
} as const;

export interface L1Headers {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_NONCE: string;
}

export async function getL1Headers(wallet: EVMWallet, nonce = 0): Promise<L1Headers> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = await wallet.signTypedData({
    domain: L1_DOMAIN,
    types: L1_TYPES,
    primaryType: 'ClobAuth',
    message: {
      address: wallet.address,
      timestamp,
      nonce,
      message: 'This message attests that I control the given wallet',
    },
  });
  return {
    POLY_ADDRESS: wallet.address,
    POLY_SIGNATURE: sig,
    POLY_TIMESTAMP: timestamp,
    POLY_NONCE: String(nonce),
  };
}

// ─── API Credentials ──────────────────────────────────────────────────────────

export interface ApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export function loadCredentials(): ApiCredentials {
  const key = process.env.POLY_API_KEY;
  const secret = process.env.POLY_API_SECRET;
  const passphrase = process.env.POLY_API_PASSPHRASE;
  if (!key || !secret || !passphrase) {
    throw new Error('POLY_API_KEY / POLY_API_SECRET / POLY_API_PASSPHRASE chưa được set trong .env');
  }
  return { key, secret, passphrase };
}

// ─── L2 Auth (HMAC-SHA256 cho mỗi request) ───────────────────────────────────

export type L2Headers = {
  POLY_ADDRESS: string;
  POLY_API_KEY: string;
  POLY_PASSPHRASE: string;
  POLY_TIMESTAMP: string;
  POLY_SIGNATURE: string;
  [key: string]: string;
}

export function getL2Headers(
  creds: ApiCredentials,
  walletAddress: string,
  method: 'GET' | 'POST' | 'DELETE',
  requestPath: string,
  body = '',
): L2Headers {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = timestamp + method + requestPath + body;
  const keyBuf = Buffer.from(creds.secret, 'base64');
  const signature = createHmac('sha256', keyBuf).update(message).digest('base64');
  return {
    POLY_ADDRESS: walletAddress,
    POLY_API_KEY: creds.key,
    POLY_PASSPHRASE: creds.passphrase,
    POLY_TIMESTAMP: timestamp,
    POLY_SIGNATURE: signature,
  };
}
