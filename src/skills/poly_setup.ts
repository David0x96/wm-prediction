/**
 * Tạo API key cho Polymarket từ ví của bạn.
 * Chạy 1 lần, sau đó lưu kết quả vào .env
 */
import { z } from 'zod';
import { loadWallet } from '../wallet/index.js';
import { createApiKey } from '../polymarket/client.js';

export const schema = z.object({}).describe('Không cần tham số. Cần PRIVATE_KEY trong .env');

export type Input = z.infer<typeof schema>;

export async function run(_input: Input) {
  const wallet = loadWallet('polygon');
  const creds = await createApiKey(wallet);
  return {
    message: 'API key tạo thành công! Lưu các giá trị sau vào .env',
    wallet_address: wallet.address,
    POLY_API_KEY: creds.key,
    POLY_API_SECRET: creds.secret,
    POLY_API_PASSPHRASE: creds.passphrase,
    warning: 'Đây là thông tin nhạy cảm — không chia sẻ với ai!',
  };
}
