import express from "express";
import { createServer as createViteServer } from "vite";
import { getConfig, saveConfig } from "./server/db";
import { getTopPairs, getCandles, analyzeSignal, Signal } from "./server/analysis";
import axios from "axios";

// Global state for signals
let activeSignals: Signal[] = [];
const sentSignals = new Set<string>();

async function fetchAndAnalyze() {
  try {
    const pairs = await getTopPairs(50);
    const telegramConfig = getConfig('telegram_config');

    // 1. Update Active Signals
    // We need current prices for all active signals, even if they are not in top 50
    const activeSymbols = new Set(activeSignals.map(s => s.symbol));
    const symbolsToFetch = new Set([...pairs, ...activeSymbols]);
    
    // Fetch prices (candles) for all relevant symbols
    // Note: In a real app, we'd use a ticker endpoint for efficiency, but getCandles works for now
    const marketData = new Map<string, { price: number, candles: any[] }>();
    const symbolsArray = Array.from(symbolsToFetch);
    
    // Process in chunks of 10 to avoid rate limits but speed up fetching
    const chunkSize = 10;
    for (let i = 0; i < symbolsArray.length; i += chunkSize) {
        const chunk = symbolsArray.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (symbol) => {
            try {
                const candles = await getCandles(symbol, '5m', 100);
                if (candles.length > 0) {
                    marketData.set(symbol, {
                        price: candles[candles.length - 1].close,
                        candles
                    });
                }
            } catch (err) {
                // Ignore individual errors to keep the loop running
            }
        }));
        // Small delay between chunks
        await new Promise(r => setTimeout(r, 200)); 
    }

    // Update existing signals
    activeSignals = activeSignals.map(signal => {
      const data = marketData.get(signal.symbol);
      if (!data) return signal;

      const currentPrice = data.price;
      let newStatus = signal.status;
      let hitTime = signal.hitTimestamp;

      if (signal.status === 'ACTIVE') {
        // Check TP
        if (currentPrice >= signal.tps[2]) { newStatus = 'TP3_HIT'; hitTime = Date.now(); }
        else if (currentPrice >= signal.tps[1]) { newStatus = 'TP2_HIT'; hitTime = Date.now(); }
        else if (currentPrice >= signal.tps[0]) { newStatus = 'TP1_HIT'; hitTime = Date.now(); }
        // Check SL
        else if (currentPrice <= signal.sl) { newStatus = 'SL_HIT'; hitTime = Date.now(); }
      } else if (signal.status.startsWith('TP')) {
         // Upgrade TP status if price goes higher
         if (currentPrice >= signal.tps[2] && signal.status !== 'TP3_HIT') { newStatus = 'TP3_HIT'; hitTime = Date.now(); }
         else if (currentPrice >= signal.tps[1] && signal.status === 'TP1_HIT') { newStatus = 'TP2_HIT'; hitTime = Date.now(); }
      }

      // Send update if status changed
      if (newStatus !== signal.status && telegramConfig?.enabled) {
         sendTelegramUpdate(telegramConfig, signal, newStatus, hitTime!);
      }

      return {
        ...signal,
        currentPrice,
        status: newStatus,
        hitTimestamp: hitTime
      };
    });

    // Remove closed/old signals (e.g., kept for 30 mins after hit or 24h if active)
    activeSignals = activeSignals.filter(s => {
      const age = Date.now() - s.timestamp;
      if (s.status === 'ACTIVE') return age < 24 * 60 * 60 * 1000; // Keep active for 24h
      return (Date.now() - (s.hitTimestamp || 0)) < 30 * 60 * 1000; // Keep hit signals for 30m
    });

    // 2. Find New Signals
    for (const pair of pairs) {
      // Skip if we already have an active signal for this pair
      if (activeSignals.some(s => s.symbol === pair && s.status === 'ACTIVE')) continue;

      const data = marketData.get(pair);
      if (data) {
        const { price, candles } = data;
        const openPrice = candles[0].open;
        const change = ((price - openPrice) / openPrice) * 100;
        
        const signal = analyzeSignal(pair, candles, price, change);

        if (signal.action === 'BUY') {
          activeSignals.push(signal);

          // Telegram Notification Logic
          if (telegramConfig?.enabled && telegramConfig?.botToken && telegramConfig?.chatId) {
             const signalKey = `${signal.symbol}-${signal.timestamp}`;
             if (!sentSignals.has(signalKey)) {
               const msgId = await sendTelegramMessage(telegramConfig, signal);
               if (msgId) {
                 signal.telegramMessageId = msgId;
               }
               sentSignals.add(signalKey);
             }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in analysis loop:", error);
  }
}

async function sendTelegramUpdate(config: any, signal: Signal, newStatus: string, hitTime: number) {
  const duration = Math.floor((hitTime - signal.timestamp) / 60000); // minutes
  let statusText = '';
  let emoji = '';
  let profitPercent = 0;

  if (newStatus === 'SL_HIT') {
    statusText = '🛑 تم ضرب وقف الخسارة (Stop Loss Hit)';
    emoji = '❌';
    profitPercent = ((signal.sl - signal.entryPrice) / signal.entryPrice) * 100;
  } else {
    const level = newStatus.replace('TP', '').replace('_HIT', '');
    const tpIndex = parseInt(level) - 1;
    const tpPrice = signal.tps[tpIndex];
    statusText = `✅ تم تحقيق الهدف ${level} (Target ${level} Hit)`;
    emoji = '💰';
    profitPercent = ((tpPrice - signal.entryPrice) / signal.entryPrice) * 100;
  }

  const message = `
${emoji} <b>تحديث إشارة: ${signal.symbol.replace('USDT', '')}</b>

<b>الحالة:</b> ${statusText}
<b>سعر الدخول:</b> ${signal.entryPrice}
<b>السعر الحالي:</b> ${signal.currentPrice}
<b>الربح/الخسارة:</b> ${profitPercent.toFixed(2)}%
<b>المدة المستغرقة:</b> ${duration} دقيقة

⏱ ${new Date().toLocaleTimeString('ar-SA')}
`;

  try {
    const payload: any = {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML'
    };
    
    if (signal.telegramMessageId) {
      payload.reply_to_message_id = signal.telegramMessageId;
    }

    await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, payload);
  } catch (error) {
    console.error('Failed to send Telegram update:', error);
  }
}

async function sendTelegramMessage(config: any, signal: Signal): Promise<number | null> {
  const emoji = '🟢';
  const halalBadge = signal.isHalal ? '✅ حلال (مشروع)' : '⚠️ غير مؤكد/مختلط';
  const typeBadge = signal.signalType ? `\n<b>نوع الإشارة:</b> ${signal.signalType}` : '';
  
  const message = `
${emoji} <b>إشارة شراء جديدة: ${signal.symbol.replace('USDT', '')}</b>
${typeBadge}

<b>السعر:</b> ${signal.entryPrice}
<b>الحكم الشرعي:</b> ${halalBadge}
<b>ملاحظة:</b> ${signal.complianceNote}

<b>RSI:</b> ${signal.rsi.toFixed(1)}
<b>التغيير:</b> ${signal.change24h.toFixed(2)}%

🎯 <b>الأهداف:</b>
1️⃣ ${signal.tps[0].toFixed(4)}
2️⃣ ${signal.tps[1].toFixed(4)}
3️⃣ ${signal.tps[2].toFixed(4)}

🛡 <b>وقف الخسارة:</b> ${signal.sl.toFixed(4)}

⏱ ${new Date().toLocaleTimeString('ar-SA')}
`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML',
    });
    console.log(`Telegram sent for ${signal.symbol}`);
    return response.data.result.message_id;
  } catch (error) {
    console.error('Failed to send Telegram:', error);
    return null;
  }
}

// Start background loop with robust scheduling
async function startAnalysisLoop() {
  console.log('Starting analysis loop...');
  while (true) {
    const start = Date.now();
    try {
      await fetchAndAnalyze();
    } catch (error) {
      console.error('Critical error in analysis loop:', error);
    }
    
    const duration = Date.now() - start;
    // Ensure we wait at least 10 seconds, or the remainder of the minute
    const delay = Math.max(10000, 60000 - duration);
    console.log(`Analysis cycle took ${duration}ms. Waiting ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

startAnalysisLoop();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/signals", (req, res) => {
    res.json(activeSignals);
  });

  app.get("/api/config", (req, res) => {
    res.json(getConfig('telegram_config') || { botToken: '', chatId: '', enabled: false });
  });

  app.post("/api/config", (req, res) => {
    saveConfig('telegram_config', req.body);
    res.json({ success: true });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving would go here
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
