import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
} from "lucide-react";

const typeLabels = {
  feoc: "FEOC",
  domestic: "Domestic Content",
  tariff: "Tariff Safe",
};

const statusConfig = {
  compliant: {
    icon: ShieldCheck,
    bg: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    textColor: "text-green-800",
    label: "Compliant",
  },
  partial: {
    icon: ShieldAlert,
    bg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    textColor: "text-amber-800",
    label: "Partial",
  },
  non_compliant: {
    icon: ShieldX,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-800",
    label: "Non-Compliant",
  },
  unknown: {
    icon: ShieldQuestion,
    bg: "bg-gray-50 border-gray-200",
    iconColor: "text-gray-500",
    textColor: "text-gray-700",
    label: "Unknown",
  },
};

export default function ComplianceBadge({ type = "feoc", status = "unknown" }) {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;
  const typeLabel = typeLabels[type] || type.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.bg}`}
      title={`${typeLabel}: ${config.label}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      <span className={config.textColor}>
        {typeLabel} - {config.label}
      </span>
    </span>
  );
}
