import axios from 'axios';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  id: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  change24h: number;
  rsi: number;
  ema: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  action: 'BUY' | 'SELL' | 'WAIT';
  tps: number[];
  sl: number;
  volume: number;
  timestamp: number;
  isHalal?: boolean;
  complianceNote?: string;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT' | 'CLOSED';
  hitTimestamp?: number;
  signalType?: string;
  telegramMessageId?: number;
}

const BASE_URL = 'https://api.binance.com/api/v3';

// Custom RSI Calculation
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Custom EMA Calculation
function calculateEMAArray(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const emas = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    emas.push((closes[i] * k) + (emas[i - 1] * (1 - k)));
  }
  return emas;
}

function calculateEMA(closes: number[], period: number = 20): number {
  const emas = calculateEMAArray(closes, period);
  return emas.length > 0 ? emas[emas.length - 1] : 0;
}

function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMAs = calculateEMAArray(closes, fastPeriod);
  const slowEMAs = calculateEMAArray(closes, slowPeriod);
  
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEMAs[i] - slowEMAs[i]);
  }
  
  const signalLine = calculateEMAArray(macdLine, signalPeriod);
  
  const currentMacd = macdLine[macdLine.length - 1] || 0;
  const currentSignal = signalLine[signalLine.length - 1] || 0;
  const hist = currentMacd - currentSignal;
  
  return { macd: currentMacd, signal: currentSignal, hist };
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const trs = [candles[0].high - candles[0].low];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }
  
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < trs.length; i++) {
    atr = ((atr * (period - 1)) + trs[i]) / period;
  }
  
  return atr;
}

export async function getTopPairs(limit = 50): Promise<string[]> {
  try {
    const response = await axios.get(`${BASE_URL}/ticker/24hr`, { timeout: 5000 });
    const data = response.data;
    
    const pairs = data
      .filter((t: any) => 
        t.symbol.endsWith('USDT') && 
        !t.symbol.includes('UP') && 
        !t.symbol.includes('DOWN') && 
        !t.symbol.includes('BULL') && 
        !t.symbol.includes('BEAR') && 
        !['BTCUSDT', 'ETHUSDT', 'USDCUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'BUSDUSDT', 'DAIUSDT', 'USDPUSDT', 'EURUSDT', 'GBPUSDT'].includes(t.symbol)
      )
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, limit)
      .map((t: any) => t.symbol);
      
    return pairs;
  } catch (error) {
    console.error('Error fetching top pairs:', error);
    return ['SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'TRXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT'];
  }
}

export async function getCandles(symbol: string, interval = '5m', limit = 100): Promise<Candle[]> {
  try {
    const response = await axios.get(`${BASE_URL}/klines`, {
      params: {
        symbol,
        interval,
        limit,
      },
      timeout: 5000 // 5 second timeout
    });
    
    return response.data.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    // console.error(`Error fetching candles for ${symbol}:`, error); // Reduce noise
    return [];
  }
}

// List of generally considered Halal coins (Project-based, excluding interest-based DeFi/Gambling)
// This is a static list for demonstration. Real-world compliance requires dynamic research.
const HALAL_COINS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'TRX', 'DOT', 
  'LINK', 'MATIC', 'LTC', 'BCH', 'ATOM', 'ETC', 'XLM', 'HBAR', 'FIL', 'VET', 
  'QNT', 'GRT', 'ALGO', 'THETA', 'SAND', 'MANA', 'AXS', 'EGLD', 'XTZ', 'EOS',
  'NEAR', 'FTM', 'GALA', 'LDO', 'APT', 'OP', 'ARB', 'INJ', 'RNDR', 'PEPE'
]);

function checkCompliance(symbol: string): { isHalal: boolean; note: string } {
  const baseAsset = symbol.replace('USDT', '');
  if (HALAL_COINS.has(baseAsset)) {
    return { isHalal: true, note: 'مشروع مباح عموماً (يرجى التأكد من التطهير)' };
  }
  return { isHalal: false, note: 'غير مدرج في القائمة المباحة أو يحتاج بحث' };
}

export function analyzeSignal(symbol: string, candles: Candle[], currentPrice: number, change24h: number): Signal {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  
  const currentRsi = calculateRSI(closes, 14);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const sma50 = calculateSMA(closes, 50);
  
  const atr = calculateATR(candles, 14);
  const macd = calculateMACD(closes);
  
  // Volume Analysis
  const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
  const currentVolume = volumes[volumes.length - 1];
  const hasVolumeSpike = currentVolume > avgVolume * 2.0; // 2x average (was 1.5x)
  
  // Whale Detection (Instant large volume spike)
  const volumeSMA20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const currentCandle = candles[candles.length - 1];
  const isGreenCandle = currentCandle.close > currentCandle.open;
  const bodySize = (currentCandle.close - currentCandle.open) / currentCandle.open;
  const isWhaleEntry = currentVolume > volumeSMA20 * 5.0 && isGreenCandle && bodySize > 0.005; // 5x volume, green, >0.5% body
  
  // Primo Strategy Logic (Simplified Strategy #4)
  // 1. Trend: Price > 50 SMA
  // 2. Setup: Low touched or went below 50 SMA recently (within last 3 candles)
  // 3. Trigger: Current candle is strong green and closes above 50 SMA
  const isPrimoTrend = currentPrice > sma50;
  const recentLows = candles.slice(-3).map(c => c.low);
  const touchedSMA50 = recentLows.some(low => low <= sma50 * 1.001); // Touched or very close
  const isPrimoTrigger = isGreenCandle && currentCandle.close > sma50 && bodySize > 0.003 && currentRsi > 50; // Added RSI > 50 and body > 0.3%
  const isPrimoSignal = isPrimoTrend && touchedSMA50 && isPrimoTrigger;

  let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  let signalType = '';
  
  if (currentPrice > ema50 && ema20 > ema50) trend = 'UP';
  else if (currentPrice < ema50 && ema20 < ema50) trend = 'DOWN';
  
  // Stronger BUY Logic
  const isMacdBullish = macd.macd > macd.signal && macd.hist > 0;
  
  if (isPrimoSignal) {
    action = 'BUY';
    signalType = 'Primo Strategy 💎';
  } else if (isWhaleEntry) {
    action = 'BUY';
    signalType = 'دخول حيتان 🐋';
  } else if (trend === 'UP' && isMacdBullish && currentRsi > 50 && currentRsi < 70 && hasVolumeSpike) { // Stricter RSI range
    action = 'BUY';
    signalType = 'زخم صاعد 📈';
  }
  
  let tps: number[] = [];
  let sl = 0;
  
  if (action === 'BUY') {
    if (signalType === 'دخول حيتان 🐋') {
      // Ultra short scalping for whale entries
      tps = [
        currentPrice * 1.005,  // TP1: 0.5%
        currentPrice * 1.01,   // TP2: 1.0%
        currentPrice * 1.015   // TP3: 1.5%
      ];
      sl = currentPrice * 0.992; // SL: 0.8%
    } else if (signalType === 'Primo Strategy 💎') {
      // Primo usually targets recent highs or fixed R:R
      // Let's use standard ATR based targets but slightly wider as it's a trend continuation
      const atrValue = atr || (currentPrice * 0.01);
      sl = Math.min(currentCandle.low, sma50) * 0.998; // SL below signal candle low or SMA
      
      tps = [
        currentPrice + (atrValue * 2),   // TP1
        currentPrice + (atrValue * 4),   // TP2
        currentPrice + (atrValue * 6)    // TP3
      ];
    } else {
      // Dynamic Targets based on ATR to avoid getting stopped out by noise
      const atrValue = atr || (currentPrice * 0.01); 
      
      sl = currentPrice - (atrValue * 2); // 2x ATR for Stop Loss
      
      // Ensure SL is not ridiculously tight or wide
      const slPercent = (currentPrice - sl) / currentPrice;
      if (slPercent < 0.005) sl = currentPrice * 0.995; // Min 0.5%
      if (slPercent > 0.03) sl = currentPrice * 0.97;   // Max 3%
      
      // Keep targets roughly 1%, 2.5%, 4% but adjusted by ATR
      tps = [
        currentPrice + Math.max(atrValue * 1.5, currentPrice * 0.01),   // TP1: ~1%
        currentPrice + Math.max(atrValue * 3, currentPrice * 0.025),  // TP2: ~2.5%
        currentPrice + Math.max(atrValue * 5, currentPrice * 0.04)    // TP3: ~4%
      ];
    }
  }

  const { isHalal, note } = checkCompliance(symbol);
  
  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    entryPrice: currentPrice,
    currentPrice: currentPrice,
    change24h,
    rsi: currentRsi,
    ema: ema20,
    trend,
    action,
    tps,
    sl,
    volume: currentVolume,
    timestamp: Date.now(),
    isHalal,
    complianceNote: note,
    status: 'ACTIVE',
    signalType
  };
}
