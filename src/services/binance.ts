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
  symbol: string;
  price: number;
  change24h: number;
  rsi: number;
  ema: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  action: 'BUY' | 'SELL' | 'WAIT';
  tps: number[];
  sl: number;
  volume: number;
  timestamp: number;
}

const BASE_URL = 'https://api.binance.com/api/v3';

// Custom RSI Calculation
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate subsequent values
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
function calculateEMA(closes: number[], period: number = 20): number {
  if (closes.length < period) return closes[closes.length - 1];

  const k = 2 / (period + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = (closes[i] * k) + (ema * (1 - k));
  }

  return ema;
}

// Fetch top volume pairs to focus on liquid altcoins
export async function getTopPairs(limit = 20): Promise<string[]> {
  try {
    const response = await axios.get(`${BASE_URL}/ticker/24hr`);
    const data = response.data;
    
    // Filter for USDT pairs, exclude stablecoins, leveraged tokens (UP/DOWN/BULL/BEAR), BTC, and ETH
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
    // Fallback list
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'TRXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT'];
  }
}

export async function getCandles(symbol: string, interval = '5m', limit = 50): Promise<Candle[]> {
  try {
    const response = await axios.get(`${BASE_URL}/klines`, {
      params: {
        symbol,
        interval,
        limit,
      },
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
    console.error(`Error fetching candles for ${symbol}:`, error);
    return [];
  }
}

export function analyzeSignal(symbol: string, candles: Candle[], currentPrice: number, change24h: number): Signal {
  const closes = candles.map(c => c.close);
  
  // Calculate RSI (14)
  const currentRsi = calculateRSI(closes, 14);
  
  // Calculate EMA (20) - Short term trend
  const currentEma = calculateEMA(closes, 20);
  
  let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  
  // Simple Scalping Logic
  if (currentPrice > currentEma) trend = 'UP';
  else if (currentPrice < currentEma) trend = 'DOWN';
  
  // More aggressive scalping thresholds
  if (currentRsi < 30) action = 'BUY';
  else if (currentRsi > 70) action = 'SELL';
  else if (currentRsi < 40 && trend === 'UP') action = 'BUY'; // Buy dip in uptrend
  else if (currentRsi > 60 && trend === 'DOWN') action = 'SELL'; // Sell rally in downtrend
  
  // Targets (Scalping: 0.6% TP, 0.5% SL)
  let tps: number[] = [];
  let sl = 0;
  
  if (action === 'BUY') {
    tps = [
      currentPrice * 1.003, // TP1: 0.3%
      currentPrice * 1.006, // TP2: 0.6%
      currentPrice * 1.012  // TP3: 1.2%
    ];
    sl = currentPrice * 0.995; // 0.5% Stop
  } else if (action === 'SELL') {
    tps = [
      currentPrice * 0.997, // TP1: 0.3%
      currentPrice * 0.994, // TP2: 0.6%
      currentPrice * 0.988  // TP3: 1.2%
    ];
    sl = currentPrice * 1.005; // 0.5% Stop
  }
  
  return {
    symbol,
    price: currentPrice,
    change24h,
    rsi: currentRsi,
    ema: currentEma,
    trend,
    action,
    tps,
    sl,
    volume: candles[candles.length - 1].volume,
    timestamp: Date.now(),
  };
}
