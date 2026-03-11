import { z } from 'zod';
import { generateMnemonic, mnemonicToAccount } from 'viem/accounts';
import { english } from 'viem/accounts';

export const schema = z.object({
  word_count: z.enum(['12', '24']).default('12').describe('Số từ trong seed phrase: 12 (phổ biến) hoặc 24 (bảo mật cao hơn)'),
  account_index: z.number().min(0).max(99).default(0).describe('Account index (0 = ví đầu tiên, 1 = thứ hai, v.v.)'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const strength = input.word_count === '24' ? 256 : 128;
  const mnemonic = generateMnemonic(english, strength);
  const account = mnemonicToAccount(mnemonic, { accountIndex: input.account_index });

  return {
    address: account.address,
    private_key: account.getHdKey().privateKey
      ? '0x' + Buffer.from(account.getHdKey().privateKey!).toString('hex')
      : null,
    mnemonic,
    derivation_path: `m/44'/60'/${input.account_index}'/0/0`,
    word_count: input.word_count,
    warning: [
      '⚠️  GHI LẠI SEED PHRASE VÀ PRIVATE KEY VÀO NƠI AN TOÀN NGAY BÂY GIỜ!',
      '⚠️  KHÔNG bao giờ chia sẻ seed phrase hoặc private key với bất kỳ ai.',
      '⚠️  Mất seed phrase = mất ví vĩnh viễn, không thể khôi phục.',
      'Dùng tool wallet_save để ghi private key vào .env tự động.',
    ],
  };
}
