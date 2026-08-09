import { USER_DATA } from '@/src/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DATA = [
  { name: 'Savings', value: 400, color: '#4f46e5' },
  { name: 'Investments', value: 300, color: '#6366f1' },
  { name: 'Cash', value: 300, color: '#818cf8' },
  { name: 'Credit', value: 200, color: '#a5b4fc' },
];

export default function SummaryPage({ user, balance }: { user?: any; balance?: number }) {
  const activeUser = user || USER_DATA;
  const activeBalance = typeof balance === 'number' ? balance : activeUser.balance;
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest opacity-50">Asset Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={DATA}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-widest opacity-50">Net Worth</h3>
            <p className="text-5xl font-bold text-slate-900 tracking-tight">${activeBalance.toLocaleString()}<span className="text-slate-300">.00</span></p>
            <p className="text-[10px] font-bold text-emerald-500 mt-4 tracking-[3px] uppercase">Growing +12.5% THIS YEAR</p>
          </div>
          
          <div className="space-y-4 mt-8">
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-500">Savings Account</span>
              <span className="text-sm font-bold text-slate-900">$2,800,000.00</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-500">Investment Portfolio</span>
              <span className="text-sm font-bold text-slate-900">$900,000.00</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-slate-500">Available Credit</span>
              <span className="text-sm font-bold text-slate-900">$100,000.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
