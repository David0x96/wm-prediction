/**
 * Polymarket CLOB authenticated client
 */
import { getL2Headers, loadCredentials, getL1Headers, type ApiCredentials } from './auth.js';
import type { EVMWallet } from '../wallet/index.js';

const BASE_URL = 'https://clob.polymarket.com';

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function authGet<T>(
  creds: ApiCredentials,
  walletAddress: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const requestPath = url.pathname + (url.search || '');
  const headers = getL2Headers(creds, walletAddress, 'GET', requestPath);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`CLOB ${path} error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function authPost<T>(
  creds: ApiCredentials,
  walletAddress: string,
  path: string,
  body: unknown,
): Promise<T> {
  const bodyStr = JSON.stringify(body);
  const headers = {
    ...getL2Headers(creds, walletAddress, 'POST', path, bodyStr),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: bodyStr });
  if (!res.ok) throw new Error(`CLOB ${path} error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function authDelete<T>(
  creds: ApiCredentials,
  walletAddress: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const bodyStr = body ? JSON.stringify(body) : '';
  const headers: Record<string, string> = {
    ...getL2Headers(creds, walletAddress, 'DELETE', path, bodyStr),
  };
  if (bodyStr) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
    body: bodyStr || undefined,
  });
  if (!res.ok) throw new Error(`CLOB ${path} error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface PlaceOrderResponse {
  success: boolean;
  orderID?: string;
  errorMsg?: string;
}

export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  side: string;
  original_size: string;
  size_matched: string;
  size_open: string;
  price: string;
  outcome: string;
  status: string;
  created_at: number;
  expiration: string;
}

export interface CancelResponse {
  canceled: string[];
  not_canceled: Array<{ order_id: string; reason: string }>;
}

// ─── Public: tạo API key từ wallet ───────────────────────────────────────────

export async function createApiKey(wallet: EVMWallet): Promise<ApiCredentials & { passphrase: string }> {
  const l1 = await getL1Headers(wallet);
  const res = await fetch(`${BASE_URL}/auth/api-key`, {
    method: 'POST',
    headers: { ...l1, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Create API key error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ApiCredentials & { passphrase: string }>;
}

// ─── Authenticated operations ─────────────────────────────────────────────────

export async function placeOrder(
  creds: ApiCredentials,
  walletAddress: string,
  order: object,
  orderType: 'GTC' | 'GTD' | 'FOK' = 'GTC',
): Promise<PlaceOrderResponse> {
  return authPost(creds, walletAddress, '/order', { order, orderType });
}

export async function getOpenOrders(
  creds: ApiCredentials,
  walletAddress: string,
  marketId?: string,
): Promise<OpenOrder[]> {
  const params: Record<string, string> = {};
  if (marketId) params['market'] = marketId;
  const result = await authGet<{ data: OpenOrder[] } | OpenOrder[]>(
    creds, walletAddress, '/orders', params,
  );
  return Array.isArray(result) ? result : result.data ?? [];
}

export async function cancelOrder(
  creds: ApiCredentials,
  walletAddress: string,
  orderId: string,
): Promise<CancelResponse> {
  return authDelete(creds, walletAddress, '/order', { orderID: orderId });
}

export async function cancelAllOrders(
  creds: ApiCredentials,
  walletAddress: string,
): Promise<CancelResponse> {
  return authDelete(creds, walletAddress, '/orders');
}

export { loadCredentials };
