import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const sizeStyles = {
  sm: "text-lg font-semibold",
  md: "text-2xl font-bold",
  lg: "text-4xl font-bold",
};

function formatCurrency(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function CurrencyDisplay({ amount, trend, size = "md" }) {
  const trendColor =
    trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "";
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeStyles[size] || sizeStyles.md} text-gray-900`}
    >
      {formatCurrency(amount)}
      {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
    </span>
  );
}
