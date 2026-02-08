import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

function FilterDropdown({ filter, activeValue, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
          activeValue
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {filter.label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {filter.options.map((option) => {
            const optionValue =
              typeof option === "string" ? option : option.value;
            const optionLabel =
              typeof option === "string" ? option : option.label;
            return (
              <button
                key={optionValue}
                onClick={() => {
                  onSelect(filter.key, optionValue);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeValue === optionValue
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {optionLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  filters = [],
  activeFilters = {},
  onChange,
}) {
  const handleSelect = (key, value) => {
    const updated = { ...activeFilters };
    if (updated[key] === value) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    onChange?.(updated);
  };

  const handleRemove = (key) => {
    const updated = { ...activeFilters };
    delete updated[key];
    onChange?.(updated);
  };

  const activeEntries = Object.entries(activeFilters).filter(
    ([, v]) => v !== undefined && v !== null,
  );

  const getLabel = (key, value) => {
    const filter = filters.find((f) => f.key === key);
    if (!filter) return `${key}: ${value}`;
    const option = filter.options.find((o) =>
      typeof o === "string" ? o === value : o.value === value,
    );
    const optionLabel =
      typeof option === "string" ? option : option?.label || value;
    return `${filter.label}: ${optionLabel}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <FilterDropdown
            key={filter.key}
            filter={filter}
            activeValue={activeFilters[filter.key]}
            onSelect={handleSelect}
          />
        ))}
      </div>
      {activeEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200"
            >
              {getLabel(key, value)}
              <button
                onClick={() => handleRemove(key)}
                className="p-0.5 rounded-full hover:bg-emerald-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => onChange?.({})}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
