import { waLink } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

export default function PhoneLink({ phone, showWa = true }) {
  if (!phone) return <span className="text-gray-400">—</span>;
  return (
    <span className="flex items-center gap-1">
      <a href={`tel:${phone}`} className="text-blue-600 hover:underline text-sm">{phone}</a>
      {showWa && (
        <a href={waLink(phone)} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700">
          <MessageCircle size={13} />
        </a>
      )}
    </span>
  );
}
