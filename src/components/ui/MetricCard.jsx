import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorMap = {
  emerald: "bg-emerald-50 text-emerald-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  blue: "bg-blue-50 text-blue-600",
  yellow: "bg-yellow-50 text-yellow-600",
  gray: "bg-gray-50 text-gray-600",
};

export default function MetricCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  color = "emerald",
}) {
  const trendColor = trend === "up" ? "text-green-600" : "text-red-600";
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const iconBg = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      {change !== undefined && change !== null && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="font-medium">{Math.abs(change)}%</span>
          <span className="text-gray-500 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
}
