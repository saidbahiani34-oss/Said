import React, { useState, useEffect, useRef } from 'react';
import { SignalCard } from './SignalCard';
import { SettingsModal } from './SettingsModal';
import { RefreshCw, Filter, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface Signal {
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

export function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BUY'>('BUY'); // Default to BUY
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/signals');
      setSignals(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data", error);
      setError("تعذر الاتصال بالخادم. تأكد من تشغيل الخادم وتحديث الصفحة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds from backend
    return () => clearInterval(interval);
  }, []);

  const filteredSignals = signals.filter(s => {
    if (filter === 'ALL') return true;
    return s.action === filter;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            ScalpMaster Spot
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            لوحة تحكم للمضاربة اللحظية (سوق السبوت - شراء فقط) • الأهداف: 1% - 4%
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'ALL' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilter('BUY')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              شراء
            </button>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700"
            title="إعدادات تلغرام"
          >
            <Settings size={20} />
          </button>

          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700"
            title="تحديث البيانات"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center h-64 text-rose-400 bg-rose-500/5 rounded-2xl border border-rose-500/10 p-8 text-center">
          <AlertCircle size={48} className="mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">خطأ في الاتصال</h3>
          <p className="text-gray-400 mb-6 max-w-md">{error}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : loading && signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>جاري الاتصال بالخادم...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSignals.map((signal) => (
            <motion.div
              key={signal.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SignalCard 
                symbol={signal.symbol}
                price={signal.currentPrice}
                entryPrice={signal.entryPrice}
                change24h={signal.change24h}
                rsi={signal.rsi}
                action={signal.action}
                tps={signal.tps}
                sl={signal.sl}
                trend={signal.trend}
                timestamp={signal.timestamp}
                isHalal={signal.isHalal}
                complianceNote={signal.complianceNote}
                status={signal.status}
                hitTimestamp={signal.hitTimestamp}
                signalType={signal.signalType}
              />
            </motion.div>
          ))}
          {filteredSignals.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
              لا توجد إشارات شراء حالياً. السوق في حالة ترقب.
            </div>
          )}
        </div>
      )}

      {lastUpdated && (
        <div className="mt-8 text-center text-xs text-gray-600 flex items-center justify-center gap-2">
          <AlertCircle size={12} />
          <span>آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}</span>
          <span className="mx-2">•</span>
          <span>يتم التحديث تلقائياً من الخادم</span>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
