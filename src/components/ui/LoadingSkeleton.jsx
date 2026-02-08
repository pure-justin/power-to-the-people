import React from "react";

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-10 w-10 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-32" />
      <SkeletonBlock className="h-4 w-40" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-4 w-24" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="px-4 py-3 flex gap-4 border-b border-gray-100"
        >
          {[1, 2, 3, 4].map((col) => (
            <SkeletonBlock key={col} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
        >
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TextSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="h-4 w-4/6" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/6" />
    </div>
  );
}

const skeletonTypes = {
  card: CardSkeleton,
  table: TableSkeleton,
  list: ListSkeleton,
  text: TextSkeleton,
};

export default function LoadingSkeleton({ type = "card", count = 1 }) {
  const SkeletonComponent = skeletonTypes[type] || skeletonTypes.card;

  if (type === "table" || type === "text") {
    return <SkeletonComponent />;
  }

  return (
    <div
      className={
        type === "list"
          ? "space-y-0"
          : "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
}
