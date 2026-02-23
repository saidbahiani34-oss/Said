import axios from 'axios';
import { Signal } from './binance';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const saveTelegramConfig = (config: TelegramConfig) => {
  localStorage.setItem('telegram_config', JSON.stringify(config));
};

export const getTelegramConfig = (): TelegramConfig => {
  const stored = localStorage.getItem('telegram_config');
  return stored ? JSON.parse(stored) : { botToken: '', chatId: '', enabled: false };
};

export const sendTelegramSignal = async (config: TelegramConfig, signal: Signal) => {
  if (!config.enabled || !config.botToken || !config.chatId) return;

  const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
  const actionText = signal.action === 'BUY' ? 'شراء (BUY)' : 'بيع (SELL)';
  
  const message = `
${emoji} <b>إشارة جديدة: ${signal.symbol.replace('USDT', '')}</b>

<b>العملية:</b> ${actionText}
<b>السعر:</b> ${signal.price}
<b>RSI:</b> ${signal.rsi.toFixed(1)}

🎯 <b>الأهداف:</b>
1️⃣ ${signal.tps[0].toFixed(4)}
2️⃣ ${signal.tps[1].toFixed(4)}
3️⃣ ${signal.tps[2].toFixed(4)}

🛡 <b>وقف الخسارة:</b> ${signal.sl.toFixed(4)}

⏱ ${new Date(signal.timestamp).toLocaleTimeString('ar-SA')}
`;

  try {
    await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};
