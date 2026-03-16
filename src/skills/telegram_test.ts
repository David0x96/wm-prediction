import { z } from 'zod';
import { sendMessage, formatTestMessage } from '../telegram/client.js';

export const schema = z.object({
  token: z.string().optional().describe('Telegram Bot Token (mặc định đọc từ TELEGRAM_BOT_TOKEN trong .env)'),
  chat_id: z.string().optional().describe('Telegram Chat ID (mặc định đọc từ TELEGRAM_CHAT_ID trong .env)'),
});

export type Input = z.infer<typeof schema>;

export async function run(input: Input) {
  const token = input.token ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = input.chat_id ?? process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error('Cần TELEGRAM_BOT_TOKEN — truyền vào hoặc set trong .env');
  if (!chatId) throw new Error('Cần TELEGRAM_CHAT_ID — truyền vào hoặc set trong .env');

  await sendMessage({ token, chatId }, formatTestMessage());

  return {
    success: true,
    message: 'Đã gửi tin nhắn test đến Telegram thành công!',
    chat_id: chatId,
    hint: 'Nếu không thấy tin, kiểm tra lại BOT_TOKEN và CHAT_ID',
  };
}
