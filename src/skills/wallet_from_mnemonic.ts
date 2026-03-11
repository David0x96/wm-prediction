import { z } from 'zod';
import { mnemonicToAccount } from 'viem/accounts';

export const schema = z.object({
  mnemonic: z.string().describe('Seed phrase 12 hoặc 24 từ, cách nhau bằng dấu cách'),
  account_index: z.number().min(0).max(99).default(0).describe('Account index — 0 là ví đầu tiên (mặc định), tăng lên để lấy ví phụ'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const mnemonic = input.mnemonic.trim().replace(/\s+/g, ' ');
  const wordCount = mnemonic.split(' ').length;

  if (wordCount !== 12 && wordCount !== 24) {
    throw new Error(`Seed phrase không hợp lệ: cần đúng 12 hoặc 24 từ, hiện có ${wordCount} từ`);
  }

  let account;
  try {
    account = mnemonicToAccount(mnemonic, { accountIndex: input.account_index });
  } catch {
    throw new Error('Seed phrase không hợp lệ — kiểm tra lại chính tả và thứ tự các từ');
  }

  const hdKey = account.getHdKey();
  const privateKey = hdKey.privateKey
    ? '0x' + Buffer.from(hdKey.privateKey).toString('hex')
    : null;

  return {
    address: account.address,
    private_key: privateKey,
    account_index: input.account_index,
    derivation_path: `m/44'/60'/${input.account_index}'/0/0`,
    word_count: wordCount,
    note: 'Dùng tool wallet_save để ghi private key vào .env tự động.',
  };
}
