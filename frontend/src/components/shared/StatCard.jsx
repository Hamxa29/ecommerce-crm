import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subValue, change, changeLabel, icon: Icon, color = 'blue', loading }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-6 flex flex-col gap-4 mt-2">
      <div className="flex items-start justify-between">
        <p className="text-[15px] text-gray-500 font-medium">{title}</p>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl', colors[color])}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-10 bg-gray-100 rounded animate-pulse w-3/4 mt-2" />
      ) : (
        <div className="mt-2">
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        </div>
      )}

      {change !== undefined && (
        <div className={cn('flex items-center gap-1.5 text-sm font-medium mt-1', {
          'text-emerald-600': isPositive,
          'text-rose-500': isNegative,
          'text-gray-400': !isPositive && !isNegative,
        })}>
          {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
          <span>{isPositive ? '+' : ''}{change}%</span>
          {changeLabel && <span className="text-gray-400 font-normal">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
