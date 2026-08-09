import { STOCKS } from '@/src/constants';
import { TrendingUp, TrendingDown, ArrowUpRight, Search } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const CHART_DATA = [
  { name: '09:00', value: 300 },
  { name: '10:00', value: 305 },
  { name: '11:00', value: 298 },
  { name: '12:00', value: 310 },
  { name: '13:00', value: 308 },
  { name: '14:00', value: 315 },
  { name: '15:00', value: 312 },
];

export default function StocksPage() {
  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Stocks & Trading</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search symbols..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold tracking-wider placeholder:uppercase focus:outline-none focus:border-indigo-200 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STOCKS.map((stock) => (
          <div key={stock.symbol} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {stock.symbol[0]}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{stock.symbol}</p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{stock.name}</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-600 transition-colors" />
            </div>
            
            <div className="h-20 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={CHART_DATA}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={stock.change > 0 ? '#10b981' : '#f43f5e'} 
                    fill={stock.change > 0 ? '#10b98110' : '#f43f5e10'} 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">${stock.price}</p>
                <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", stock.change > 0 ? "text-emerald-500" : "text-rose-500")}>
                  {stock.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(stock.change)}%
                </div>
              </div>
              <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
                Trade
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
