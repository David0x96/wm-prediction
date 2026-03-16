import fetch from 'node-fetch';

const BASE_URL = 'https://api.telegram.org';

export interface TelegramConfig {
  token: string;
  chatId: string;
}

export async function sendMessage(config: TelegramConfig, text: string): Promise<void> {
  const url = `${BASE_URL}/bot${config.token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}

export function formatAlert({
  question,
  condition,
  currentPrice,
  threshold,
  slug,
}: {
  question: string;
  condition: 'above' | 'below';
  currentPrice: number;
  threshold: number;
  slug: string;
}): string {
  const icon = condition === 'above' ? '▲' : '▼';
  const label = condition === 'above' ? 'vượt ngưỡng' : 'xuống dưới';
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  return [
    `🔔 <b>Polymarket Alert</b>`,
    ``,
    `📌 ${question}`,
    ``,
    `${icon} YES ${label} <b>${(threshold * 100).toFixed(1)}%</b>`,
    `   Giá hiện tại: <b>${(currentPrice * 100).toFixed(1)}%</b>`,
    `   Ngưỡng đặt:   ${(threshold * 100).toFixed(1)}%`,
    ``,
    `🕐 ${time}`,
    `🔗 polymarket.com/event/${slug}`,
  ].join('\n');
}

export function formatTestMessage(): string {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return [
    `✅ <b>Polymarket MCP — Kết nối thành công!</b>`,
    ``,
    `Bot đã được cấu hình đúng và sẵn sàng gửi alerts.`,
    `🕐 ${time}`,
  ].join('\n');
}

export function loadTelegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}
