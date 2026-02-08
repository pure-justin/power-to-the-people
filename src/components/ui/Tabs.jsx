import React from "react";

export default function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-0 -mb-px" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(tab.key)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "text-emerald-600 border-b-2 border-emerald-500"
                  : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && tab.count !== null && (
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
