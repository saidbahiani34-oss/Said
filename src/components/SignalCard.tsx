import React from 'react';
import { ArrowUp, ArrowDown, Minus, Target, ShieldAlert, Activity, Clock, Crosshair, CheckCircle, AlertTriangle, Timer } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SignalCardProps {
  symbol: string;
  price: number; // This is now currentPrice
  entryPrice: number;
  change24h: number;
  rsi: number;
  action: 'BUY' | 'SELL' | 'WAIT';
  tps: number[];
  sl: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  timestamp: number;
  isHalal?: boolean;
  complianceNote?: string;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT' | 'CLOSED';
  hitTimestamp?: number;
  signalType?: string;
}

export function SignalCard({ symbol, price, entryPrice, change24h, rsi, action, tps, sl, trend, timestamp, isHalal, complianceNote, status, hitTimestamp, signalType }: SignalCardProps) {
  const isBuy = action === 'BUY';
  const isSell = action === 'SELL';
  const isWait = action === 'WAIT';

  const actionColor = isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-gray-400';
  const bgAction = isBuy ? 'bg-emerald-500/5 border-emerald-500/30' : isSell ? 'bg-rose-500/5 border-rose-500/30' : 'bg-gray-800/50 border-gray-700';
  const headerBg = isBuy ? 'bg-emerald-500/10' : isSell ? 'bg-rose-500/10' : 'bg-gray-800/50';

  const formatPrice = (p: number) => p < 1 ? p.toFixed(6) : p.toFixed(2);
  
  const duration = hitTimestamp ? Math.floor((hitTimestamp - timestamp) / 60000) : Math.floor((Date.now() - timestamp) / 60000);

  const getStatusBadge = () => {
    if (status === 'SL_HIT') return <span className="text-rose-500 font-bold flex items-center gap-1"><ShieldAlert size={14}/> ضرب الستوب</span>;
    if (status.includes('TP')) return <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle size={14}/> حقق الهدف {status.replace('TP', '').replace('_HIT', '')}</span>;
    return <span className="text-blue-400 font-bold flex items-center gap-1"><Activity size={14}/> نشطة</span>;
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border transition-all hover:shadow-xl hover:border-opacity-60 group", bgAction)}>
      
      {/* Header */}
      <div className={cn("flex justify-between items-center p-4 border-b border-white/5", headerBg)}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner", 
            isBuy ? "bg-emerald-500 text-white" : isSell ? "bg-rose-500 text-white" : "bg-gray-700 text-gray-400"
          )}>
            {isBuy ? <ArrowUp size={24} strokeWidth={3} /> : isSell ? <ArrowDown size={24} strokeWidth={3} /> : <Minus size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-none tracking-wide">
              {symbol.replace('USDT', '')}
            </h3>
            <span className={cn("text-xs font-bold uppercase tracking-wider", actionColor)}>
              {isBuy ? 'شراء (BUY)' : isSell ? 'بيع (SELL)' : 'ترقب (WAIT)'}
            </span>
          </div>
        </div>
        <div className="text-right">
           <div className="flex items-center gap-1 justify-end text-gray-400 text-[10px] mb-0.5">
            <Clock size={10} />
            <span>{new Date(timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={cn("text-xs font-mono px-2 py-0.5 rounded-full bg-black/20 border border-white/5 inline-block", 
            change24h >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        
        {/* Signal Meta Info */}
        <div className="flex flex-wrap items-center gap-2">
            {signalType && (
              <div className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-900/20">
                {signalType}
              </div>
            )}
            
            {isHalal !== undefined && (
              <div className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5 shadow-sm", 
                  isHalal ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-900/20" : "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-900/20"
              )}>
                  {isHalal ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  <span>{isHalal ? 'حلال' : 'مختلط/بحث'}</span>
              </div>
            )}

            <div className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-gray-700 bg-gray-800/80 text-gray-300 flex items-center gap-1.5 ml-auto">
                <Timer size={12} />
                <span dir="ltr">{duration} min</span>
            </div>
        </div>

        {/* Status Banner */}
        <div className="bg-black/40 rounded-xl p-3 text-center text-sm border border-white/5 shadow-inner">
            {getStatusBadge()}
        </div>

        {/* Prices Grid */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                  <Crosshair size={10} /> سعر الدخول
                </div>
                <div className="font-mono font-bold text-white text-base tracking-tight">{formatPrice(entryPrice)}</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                  <Activity size={10} /> السعر الحالي
                </div>
                <div className={cn("font-mono font-bold text-base tracking-tight", price > entryPrice ? "text-emerald-400" : price < entryPrice ? "text-rose-400" : "text-white")}>
                    {formatPrice(price)}
                </div>
            </div>
        </div>

        {/* Targets & Stop */}
        <div className="grid grid-cols-1 gap-2">
          {/* Targets */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 px-1">
              <Target size={12} />
              <span>الأهداف (Take Profit)</span>
            </div>
            {isWait ? (
              <div className="text-center py-2 text-gray-600 text-sm italic">في انتظار إشارة...</div>
            ) : (
              tps.map((tp, index) => {
                const percent = ((tp - entryPrice) / entryPrice * 100).toFixed(1);
                const isHit = (status.includes('TP') && parseInt(status.charAt(2)) >= index + 1);
                
                return (
                  <div key={index} className={cn("flex justify-between items-center px-3 py-2 rounded-lg border transition-colors", 
                      isHit ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-emerald-500/5 border-emerald-500/10"
                  )}>
                    <span className="text-xs font-medium flex items-center gap-2">
                      هدف {index + 1} 
                      <span className="text-[10px] opacity-70">({percent}%)</span>
                      {isHit && <CheckCircle size={12} />}
                    </span>
                    <span className="font-mono text-sm font-bold">{price < 1 ? tp.toFixed(6) : tp.toFixed(2)}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Stop Loss */}
          <div className="mt-2">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 px-1">
              <ShieldAlert size={12} />
              <span>وقف الخسارة (Stop Loss)</span>
            </div>
            <div className={cn("flex justify-between items-center px-3 py-2 rounded-lg border", 
                status === 'SL_HIT' ? "bg-rose-500/20 border-rose-500 text-rose-300" : "bg-rose-500/5 border-rose-500/10"
            )}>
              <span className="text-xs font-medium flex items-center gap-2">
                  SL
                  {status === 'SL_HIT' && <AlertTriangle size={12} />}
              </span>
              <span className={cn("font-mono text-sm font-bold", isWait ? "text-gray-600" : "text-rose-400")}>
                {isWait ? '---' : formatPrice(sl)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
