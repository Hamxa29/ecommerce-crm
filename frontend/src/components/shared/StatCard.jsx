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
    <div className="bg-white rounded-xl border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {Icon && (
          <div className={cn('p-2 rounded-lg', colors[color])}>
            <Icon size={16} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
      ) : (
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
        </div>
      )}

      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', {
          'text-green-600': isPositive,
          'text-red-500': isNegative,
          'text-gray-400': !isPositive && !isNegative,
        })}>
          {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
          <span>{isPositive ? '+' : ''}{change}%</span>
          {changeLabel && <span className="text-gray-400 font-normal">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
