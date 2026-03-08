import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNGN(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function waLink(phone) {
  const digits = phone?.toString().replace(/\D/g, '');
  if (!digits) return '#';
  const normalized = digits.startsWith('0') ? '234' + digits.slice(1) : digits;
  return `https://wa.me/${normalized}`;
}
