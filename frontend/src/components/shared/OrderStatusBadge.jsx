import { ORDER_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function OrderStatusBadge({ status, size = 'sm' }) {
  const found = ORDER_STATUSES.find(s => s.value === status);
  if (!found) return <span className="text-gray-400 text-xs">{status}</span>;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium whitespace-nowrap',
      found.color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      {found.label}
    </span>
  );
}
