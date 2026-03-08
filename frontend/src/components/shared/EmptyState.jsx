import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title = 'No results', description = 'Nothing to show here yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen size={40} className="text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  );
}
