import React from "react";
import { Check, Circle, Clock } from "lucide-react";

const statusConfig = {
  completed: {
    dot: "bg-green-500",
    line: "bg-green-300",
    icon: Check,
    iconColor: "text-white",
  },
  active: {
    dot: "bg-emerald-500 ring-4 ring-emerald-100",
    line: "bg-emerald-300",
    icon: Circle,
    iconColor: "text-white",
  },
  pending: {
    dot: "bg-gray-300",
    line: "bg-gray-200",
    icon: Clock,
    iconColor: "text-white",
  },
};

export default function Timeline({ items = [] }) {
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {items.map((item, index) => {
          const config = statusConfig[item.status] || statusConfig.pending;
          const isLast = index === items.length - 1;
          const StatusIcon = item.icon || config.icon;

          return (
            <li key={index}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className={`absolute top-5 left-5 -ml-px h-full w-0.5 ${config.line}`}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${config.dot}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>
                      {item.date && (
                        <time className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {item.date}
                        </time>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
