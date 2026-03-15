import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isBefore, startOfDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Bell, BellOff } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const REMINDER_OPTIONS = [
  { label: '1 hour before',  value: 60 },
  { label: '3 hours before', value: 180 },
  { label: '6 hours before', value: 360 },
  { label: '1 day before',   value: 1440 },
  { label: '2 days before',  value: 2880 },
  { label: '3 days before',  value: 4320 },
];

/**
 * Props:
 *   value          – ISO string or null
 *   onChange       – (isoString) => void
 *   reminderEnabled – boolean
 *   reminderOffset  – minutes (number)
 *   onReminderChange – ({ enabled, offset }) => void
 *   showReminder    – boolean (default true)
 */
export default function CalendarPicker({
  value,
  onChange,
  reminderEnabled = false,
  reminderOffset = 1440,
  onReminderChange,
  showReminder = true,
}) {
  const today = startOfDay(new Date());
  const parsed = value ? new Date(value) : null;

  const [viewMonth, setViewMonth] = useState(parsed ?? today);
  const [selectedDate, setSelectedDate] = useState(parsed ? startOfDay(parsed) : null);
  const [hour, setHour] = useState(parsed ? parsed.getHours() : 8);
  const [minute, setMinute] = useState(parsed ? Math.floor(parsed.getMinutes() / 15) * 15 : 0);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const emit = (date, h, m) => {
    if (!date) return;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    onChange(d.toISOString());
  };

  const pickDay = (day) => {
    if (isBefore(day, today)) return;
    setSelectedDate(day);
    emit(day, hour, minute);
  };

  const changeHour = (h) => {
    setHour(h);
    if (selectedDate) emit(selectedDate, h, minute);
  };

  const changeMinute = (m) => {
    setMinute(m);
    if (selectedDate) emit(selectedDate, hour, m);
  };

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 pb-1">{d}</div>
        ))}
        {/* Empty pads */}
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {/* Days */}
        {days.map(day => {
          const past = isBefore(day, today);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={past}
              onClick={() => pickDay(day)}
              className={`
                w-full aspect-square text-xs rounded-lg font-medium transition-colors
                ${selected ? 'bg-primary text-white' : ''}
                ${!selected && isToday ? 'border border-primary text-primary' : ''}
                ${!selected && !isToday && !past ? 'hover:bg-gray-100 text-gray-700' : ''}
                ${past ? 'text-gray-300 cursor-not-allowed' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Time picker */}
      <div className="border-t pt-3">
        <p className="text-xs font-medium text-gray-600 mb-2">Delivery Time</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 mb-0.5 block">Hour</label>
            <select
              value={hour}
              onChange={e => changeHour(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 mt-4">:</span>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 mb-0.5 block">Minute</label>
            <select
              value={minute}
              onChange={e => changeMinute(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[0, 15, 30, 45].map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedDate && (
          <p className="text-xs text-primary mt-2 font-medium">
            📅 {format(selectedDate, 'EEE, d MMM yyyy')} at {String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')}
          </p>
        )}
      </div>

      {/* Reminder toggle */}
      {showReminder && onReminderChange && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {reminderEnabled ? <Bell size={14} className="text-primary" /> : <BellOff size={14} className="text-gray-400" />}
              <span className="text-xs font-medium text-gray-700">WhatsApp Reminder</span>
            </div>
            <button
              type="button"
              onClick={() => onReminderChange({ enabled: !reminderEnabled, offset: reminderOffset })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                reminderEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                reminderEnabled ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {reminderEnabled && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Send reminder</label>
              <select
                value={reminderOffset}
                onChange={e => onReminderChange({ enabled: true, offset: Number(e.target.value) })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {REMINDER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                A WhatsApp message will be sent to the customer's phone automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
