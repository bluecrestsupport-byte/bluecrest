import { 
  Send, 
  History, 
  TrendingUp, 
  TrendingDown,
  Building2,
  WalletCards,
  CreditCard,
  Landmark
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { USER_DATA, TRANSACTIONS, STOCKS, ACTIVITY_DATA } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

type MarketSnapshot = {
  targetCurrency: string;
  usdRate: number;
  bitcoinUsd: number;
  bitcoinChange24h: number | null;
  updatedAt: string;
};

export default function DashboardOverview({ 
  onActionClick,
  balance = USER_DATA.balance,
  transactions = TRANSACTIONS,
  user,
  formatUserCurrency
}: { 
  onActionClick: (id: string) => void;
  balance?: number;
  transactions?: any[];
  user?: any;
  formatUserCurrency?: (amount: number) => string;
}) {
  const activeUser = user || USER_DATA;
  const accountState = String(activeUser.status || 'ACTIVE').toUpperCase();
  const transferFlow = String(activeUser.transfer_flow || activeUser.transferFlow || 'ACTIVE').toUpperCase();
  const awaitingClearance = accountState === 'ACTIVE' && transferFlow === 'AUTHORIZATION_HOLD';
  const restricted = accountState !== 'ACTIVE' || transferFlow === 'RESTRICTED';
  const accountStatusLabel = restricted ? 'Restricted' : awaitingClearance ? 'Clearance Required' : 'Active';
  const accountType = String(activeUser.account_type || activeUser.accountType || 'CHECKING').replaceAll('_', ' ');
  const checkingBalance = Number(balance || 0);
  const savingsBalance = Number(activeUser.savings_balance ?? activeUser.savingsBalance ?? 0);
  const preferredCurrency = (
    activeUser.preferred_currency ||
    activeUser.preferredCurrency ||
    'USD'
  ).toUpperCase();
  const marketCurrency = preferredCurrency === 'USD' ? 'EUR' : preferredCurrency;
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const formatCurrency = formatUserCurrency || ((amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amt);
  });

  useEffect(() => {
    const cacheKey = `bluecrest_market_${marketCurrency}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setMarketSnapshot(JSON.parse(cached));
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const loadMarketSnapshot = () => {
      fetch(`/api/v1/market?currency=${encodeURIComponent(marketCurrency)}`)
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(payload => {
          const snapshot = payload.data as MarketSnapshot;
          setMarketSnapshot(snapshot);
          localStorage.setItem(cacheKey, JSON.stringify(snapshot));
        })
        .catch(() => {
          // Keep the last successful snapshot when a provider is temporarily unavailable.
        })
        .finally(() => setMarketLoading(false));
    };

    loadMarketSnapshot();
    const refreshTimer = window.setInterval(loadMarketSnapshot, 5 * 60 * 1000);

    return () => window.clearInterval(refreshTimer);
  }, [marketCurrency]);

  const forexLabel = preferredCurrency === 'USD'
    ? `${marketCurrency} / USD`
    : `USD / ${marketCurrency}`;
  const forexValue = marketSnapshot
    ? preferredCurrency === 'USD'
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 4
        }).format(1 / marketSnapshot.usdRate)
      : new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: marketCurrency,
          maximumFractionDigits: 4
        }).format(marketSnapshot.usdRate)
    : marketLoading ? 'Updating…' : 'Unavailable';
  const bitcoinValue = marketSnapshot
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(marketSnapshot.bitcoinUsd)
    : marketLoading ? 'Updating…' : 'Unavailable';

  return (
    <div className="space-y-8 pb-12">
      {/* Top Row: Balance & Card */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Balance Card */}
        <div className="dashboard-balance-card min-w-0 flex-1 bg-[#003399] rounded-[2.5rem] border border-white/10 shadow-2xl p-6 md:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="dashboard-orbit dashboard-orbit-primary" aria-hidden="true" />
          <div className="dashboard-orbit dashboard-orbit-secondary" aria-hidden="true" />
          <div className="dashboard-glow-orb" aria-hidden="true" />
          <div className="relative z-10 min-w-0">
            <p className="text-[10px] md:text-sm text-blue-200/60 mb-2 font-bold uppercase tracking-widest">Total Balance</p>
            <h2 className="dashboard-balance-value max-w-full font-bold tracking-tighter">
              {formatCurrency(checkingBalance + savingsBalance)}
            </h2>
            <div className="mt-6 grid max-w-xl grid-cols-1 min-[440px]:grid-cols-2 gap-3">
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70">Checking</p>
                <p className="dashboard-balance-break mt-1 text-base sm:text-lg font-extrabold tracking-tight">{formatCurrency(checkingBalance)}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70">Savings</p>
                <p className="dashboard-balance-break mt-1 text-base sm:text-lg font-extrabold tracking-tight">{formatCurrency(savingsBalance)}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest">{accountType} Account</span>
              <span className="text-[10px] font-semibold tracking-[0.14em] text-blue-100">Account •••• {String(activeUser.account_number || activeUser.accountNumber || '').slice(-4)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-6 mt-10 md:mt-16 relative z-10">
            <div>
              <p className="text-[9px] md:text-[10px] text-blue-200/50 uppercase tracking-widest font-bold mb-1">{forexLabel}</p>
              <p className="text-base md:text-xl font-bold text-emerald-400">{forexValue}</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-blue-200/40">
                {preferredCurrency === 'USD' ? `1 ${marketCurrency}` : '1 US dollar'}
              </p>
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] text-blue-200/50 uppercase tracking-widest font-bold mb-1">Bitcoin / USD</p>
              <p className="text-base md:text-xl font-bold text-amber-300">{bitcoinValue}</p>
              <p className={cn(
                "mt-1 text-[8px] font-semibold uppercase tracking-wider",
                marketSnapshot?.bitcoinChange24h == null
                  ? "text-blue-200/40"
                  : marketSnapshot.bitcoinChange24h >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
              )}>
                {marketSnapshot?.bitcoinChange24h == null
                  ? 'Live market price'
                  : `${marketSnapshot.bitcoinChange24h >= 0 ? '+' : ''}${marketSnapshot.bitcoinChange24h.toFixed(2)}% today`}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] md:text-[10px] text-blue-200/50 uppercase tracking-widest font-bold mb-1">Account Status</p>
              <p className={`text-base md:text-xl font-bold ${restricted ? 'text-rose-300' : awaitingClearance ? 'text-amber-300' : 'text-emerald-300'}`}>{accountStatusLabel}</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-blue-200/50">{accountType} account</p>
            </div>
          </div>
        </div>
        
        {/* Loan eligibility */}
        <div className="lg:w-96 w-full">
          <div className="relative flex h-full min-h-48 items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-xl shadow-emerald-900/10">
            <div className="absolute -right-10 -bottom-12 w-36 h-36 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Eligible Loan Amount</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight">{formatCurrency(60)}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-50/80">Ready when you need a little extra support.</p>
              <button
                onClick={() => onActionClick('loans')}
                className="mt-5 rounded-xl bg-white/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/25"
              >
                Apply for financing →
              </button>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="quick-services-heading">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#003399]">Move money faster</p>
          <h3 id="quick-services-heading" className="mt-1 text-lg font-extrabold text-slate-900">Quick services</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { id: 'transfer', label: 'Wire Transfer', detail: 'Other banks', icon: Send, color: 'bg-blue-50 text-[#003399]' },
            { id: 'local-transfer', label: 'Local Transfer', detail: 'Blue Crest', icon: Building2, color: 'bg-indigo-50 text-indigo-600' },
            { id: 'deposit', label: 'Deposit', detail: 'Bitcoin & Gift', icon: WalletCards, color: 'bg-amber-50 text-amber-600' },
            { id: 'history', label: 'Transactions', detail: 'Full history', icon: History, color: 'bg-emerald-50 text-emerald-600' },
            { id: 'atm', label: 'Credit', detail: 'Card services', icon: CreditCard, color: 'bg-fuchsia-50 text-fuchsia-600' },
            { id: 'loans', label: 'Loans', detail: 'Get financing', icon: Landmark, color: 'bg-cyan-50 text-cyan-700' },
          ].map((action) => (
            <button key={action.label} type="button" onClick={() => onActionClick(action.id)} className="group min-w-0 rounded-[1.5rem] border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] sm:p-5">
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105', action.color)}>
                <action.icon className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-xs font-extrabold leading-tight text-slate-800">{action.label}</span>
              <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">{action.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm" aria-labelledby="recent-transactions-heading">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-5 md:px-8 md:py-6">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#003399]">Bank transfer history</p>
            <h3 id="recent-transactions-heading" className="mt-1 text-sm font-extrabold text-slate-900">Recent transactions</h3>
          </div>
          <button onClick={() => onActionClick('history')} className="text-[10px] font-bold uppercase tracking-widest text-[#003399] hover:underline">View all</button>
        </div>
        <div className="divide-y divide-slate-50 px-5 md:px-8">
          {transactions.slice(0, 5).map((trx) => (
            <div key={trx.id} className="flex items-center justify-between gap-3 py-4 md:py-5">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', trx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500')}>
                  {trx.type === 'credit' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{trx.name}</p>
                  <p className="truncate text-[9px] font-bold uppercase tracking-tight text-slate-400">{trx.category} • {trx.date}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('text-sm font-bold', trx.type === 'debit' ? 'text-rose-500' : 'text-emerald-500')}>{trx.type === 'debit' ? '-' : '+'}{formatCurrency(trx.amount)}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-300">{trx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity Chart Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-5 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial Performance</h3>
            <p className="text-xs font-bold text-slate-900">Income vs. Spending Overview</p>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
             <button className="flex-1 sm:flex-none px-4 py-1.5 bg-white shadow-sm rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">Weekly</button>
             <button className="flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly</button>
          </div>
        </div>
        <div className="h-[250px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={ACTIVITY_DATA}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003399" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#003399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 'bold' }}
                cursor={{ stroke: '#003399', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#003399" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
