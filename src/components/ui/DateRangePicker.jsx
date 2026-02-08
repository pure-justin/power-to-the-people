import React from "react";
import { Calendar } from "lucide-react";

function formatDateForInput(date) {
  if (!date) return "";
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
}

function subtractDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDateForInput(d);
}

function getToday() {
  return formatDateForInput(new Date());
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const handleStartChange = (e) => {
    onChange?.({ startDate: e.target.value, endDate: endDate || getToday() });
  };

  const handleEndChange = (e) => {
    onChange?.({
      startDate: startDate || subtractDays(30),
      endDate: e.target.value,
    });
  };

  const handlePreset = (days) => {
    onChange?.({ startDate: subtractDays(days), endDate: getToday() });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={handleStartChange}
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <span className="text-sm text-gray-500">to</span>
        <input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={handleEndChange}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div className="flex items-center gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.days)}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
