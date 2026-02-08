import React from "react";

const colorMap = {
  emerald: { stroke: "#10b981", trail: "#d1fae5" },
  green: { stroke: "#22c55e", trail: "#dcfce7" },
  amber: { stroke: "#f59e0b", trail: "#fef3c7" },
  red: { stroke: "#ef4444", trail: "#fee2e2" },
  blue: { stroke: "#3b82f6", trail: "#dbeafe" },
  yellow: { stroke: "#eab308", trail: "#fef9c3" },
};

export default function GaugeMeter({
  value = 0,
  max = 100,
  label = "",
  color = "emerald",
}) {
  const percentage =
    max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const filledLength = (percentage / 100) * arcLength;
  const colors = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-40">
        <svg viewBox="0 0 200 170" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={colors.trail}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            transform="rotate(135 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${circumference}`}
            strokeDashoffset={0}
            transform="rotate(135 100 100)"
            className="transition-all duration-700 ease-out"
          />
          <text
            x="100"
            y="90"
            textAnchor="middle"
            className="fill-gray-900 text-3xl font-bold"
            style={{ fontSize: "32px" }}
          >
            {percentage}%
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            className="fill-gray-500 text-sm"
            style={{ fontSize: "14px" }}
          >
            {value} / {max}
          </text>
        </svg>
      </div>
      {label && (
        <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      )}
    </div>
  );
}
