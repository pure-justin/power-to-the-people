import React, { useState, useCallback } from "react";

export default function KanbanBoard({ columns = [], onDragEnd, renderCard }) {
  const [dragState, setDragState] = useState({
    itemId: null,
    sourceColId: null,
  });
  const [dropTarget, setDropTarget] = useState(null);

  const handleDragStart = useCallback((e, item, columnId) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ itemId: item.id, sourceColId: columnId }),
    );
    setDragState({ itemId: item.id, sourceColId: columnId });
  }, []);

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e, targetColId) => {
      e.preventDefault();
      setDropTarget(null);
      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (data.sourceColId !== targetColId && onDragEnd) {
          onDragEnd({
            itemId: data.itemId,
            sourceColumnId: data.sourceColId,
            targetColumnId: targetColId,
          });
        }
      } catch {
        // ignore malformed drag data
      }
      setDragState({ itemId: null, sourceColId: null });
    },
    [onDragEnd],
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ itemId: null, sourceColId: null });
    setDropTarget(null);
  }, []);

  const colorMap = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
          className={`flex-shrink-0 w-72 rounded-xl border transition-colors ${
            dropTarget === col.id
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {col.title}
                </h3>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    colorMap[col.color] || colorMap.gray
                  }`}
                >
                  {col.items?.length || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="p-2 space-y-2 min-h-[120px]">
            {(col.items || []).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item, col.id)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                  dragState.itemId === item.id ? "opacity-50" : ""
                }`}
              >
                {renderCard ? (
                  renderCard(item, col)
                ) : (
                  <p className="text-sm text-gray-700">
                    {item.title || item.name || String(item.id)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
