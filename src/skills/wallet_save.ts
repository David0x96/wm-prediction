import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const schema = z.object({
  private_key: z.string().describe('Private key cần lưu (dạng 0x...)'),
});

export type Input = z.infer<typeof schema>;

const ENV_PATH = resolve(process.cwd(), '.env');

export async function run(input: Input) {
  const pk = input.private_key.trim();
  if (!pk.startsWith('0x') || pk.length !== 66) {
    throw new Error('Private key không hợp lệ — phải bắt đầu bằng 0x và dài 66 ký tự');
  }

  // Đọc .env hiện tại hoặc tạo mới
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';

  if (content.includes('PRIVATE_KEY=')) {
    // Backup giá trị cũ trong comment, thay bằng giá trị mới
    content = content.replace(
      /^(PRIVATE_KEY=.*)$/m,
      `PRIVATE_KEY=${pk}`,
    );
  } else {
    content = `PRIVATE_KEY=${pk}\n` + content;
  }

  writeFileSync(ENV_PATH, content, 'utf-8');

  // Verify bằng cách load lại
  const { privateKeyToAccount } = await import('viem/accounts');
  const account = privateKeyToAccount(pk as `0x${string}`);

  return {
    success: true,
    address: account.address,
    message: `Private key đã được lưu vào .env. Ví: ${account.address}`,
    env_path: ENV_PATH,
  };
}
