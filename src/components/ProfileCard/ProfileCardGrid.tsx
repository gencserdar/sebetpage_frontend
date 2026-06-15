import { useEffect, useMemo, useRef, useState } from "react";
import { GripHorizontal, Trash2 } from "lucide-react";
import {
  getCatalogItem,
  GRID_COLS,
  GRID_GAP_PX,
  GRID_ROWS,
  WIDGET_ICONS,
  fixedGridSize,
  fitGridToContainer,
} from "./constants";
import { computeResizeGeometry, isCellOccupied, ResizeHandle } from "./gridUtils";
import { ProfileWidget } from "./types";

interface GridMetrics {
  cellW: number;
  cellH: number;
  gap: number;
  width: number;
  height: number;
}

interface ProfileCardGridProps {
  widgets: ProfileWidget[];
  mode: "view" | "edit";
  fill?: boolean;
  className?: string;
  onCellClick?: (x: number, y: number) => void;
  onRemoveWidget?: (id: string) => void;
  onMoveWidget?: (id: string, x: number, y: number) => void;
  onResizeWidget?: (
    id: string,
    patch: { x: number; y: number; w: number; h: number }
  ) => void;
}

const INVISIBLE_RESIZE_ZONES: { handle: ResizeHandle; className: string }[] = [
  { handle: "s", className: "left-0 right-0 bottom-0 z-10 h-3 cursor-ns-resize" },
  { handle: "w", className: "left-0 top-0 bottom-0 z-10 w-3 cursor-ew-resize" },
  { handle: "e", className: "right-0 top-0 bottom-0 z-10 w-3 cursor-ew-resize" },
  { handle: "sw", className: "left-0 bottom-0 z-10 h-5 w-5 cursor-nesw-resize" },
  { handle: "se", className: "right-0 bottom-0 z-10 h-5 w-5 cursor-nwse-resize" },
  // Top edge + corners above header so the bar's upper rim can resize north
  { handle: "n", className: "left-0 right-0 top-0 z-40 h-2 cursor-ns-resize" },
  { handle: "nw", className: "left-0 top-0 z-40 h-5 w-5 cursor-nwse-resize" },
  { handle: "ne", className: "right-0 top-0 z-40 h-5 w-5 cursor-nesw-resize" },
];

function defaultMetrics(): GridMetrics {
  return fixedGridSize();
}

function widgetStyle(widget: ProfileWidget, metrics: GridMetrics) {
  const { cellW, cellH, gap } = metrics;
  return {
    left: widget.x * (cellW + gap),
    top: widget.y * (cellH + gap),
    width: widget.w * cellW + (widget.w - 1) * gap,
    height: widget.h * cellH + (widget.h - 1) * gap,
  };
}

function measureContainer(el: HTMLElement, mode: "view" | "edit"): GridMetrics {
  return fitGridToContainer(el, { uniformCells: shouldUseUniformCells(mode) });
}

function shouldUseUniformCells(mode: "view" | "edit") {
  return mode === "view";
}

export default function ProfileCardGrid({
  widgets,
  mode,
  fill = false,
  className = "",
  onCellClick,
  onRemoveWidget,
  onMoveWidget,
  onResizeWidget,
}: ProfileCardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<GridMetrics>(defaultMetrics);

  useEffect(() => {
    if (!fill) return;
    const el = containerRef.current;
    if (!el) return;

    const shell = el.parentElement;
    if (!shell) return;

    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setMetrics(measureContainer(shell, mode));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(shell);
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [fill, mode]);

  const emptyCells = useMemo(() => {
    if (mode !== "edit") return [];
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!isCellOccupied(widgets, x, y)) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }, [widgets, mode]);

  const startDrag = (widget: ProfileWidget, e: React.MouseEvent) => {
    if (mode !== "edit" || !onMoveWidget) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const originX = widget.x;
    const originY = widget.y;
    const stepX = metrics.cellW + metrics.gap;
    const stepY = metrics.cellH + metrics.gap;

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round((ev.clientX - startX) / stepX);
      const dy = Math.round((ev.clientY - startY) / stepY);
      onMoveWidget(widget.id, originX + dx, originY + dy);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (widget: ProfileWidget, handle: ResizeHandle, e: React.MouseEvent) => {
    if (mode !== "edit" || !onResizeWidget) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { x: widget.x, y: widget.y, w: widget.w, h: widget.h };
    const catalog = getCatalogItem(widget.type);
    const stepX = metrics.cellW + metrics.gap;
    const stepY = metrics.cellH + metrics.gap;

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round((ev.clientX - startX) / stepX);
      const dy = Math.round((ev.clientY - startY) / stepY);
      const next = computeResizeGeometry(handle, origin, dx, dy, {
        minW: catalog.minW,
        minH: catalog.minH,
        maxW: catalog.maxW,
        maxH: catalog.maxH,
      });
      onResizeWidget(widget.id, next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const { cellW, cellH, gap } = metrics;

  return (
    <div
      ref={containerRef}
      className={`relative ${fill ? "h-full w-full" : "mx-auto shrink-0"} ${className}`}
      style={fill ? undefined : { width: metrics.width, height: metrics.height }}
    >
      {mode === "edit" &&
        Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, index) => {
          const x = index % GRID_COLS;
          const y = Math.floor(index / GRID_COLS);
          return (
            <div
              key={`cell-bg-${x}-${y}`}
              className="absolute rounded-xl border border-dashed border-white/[0.08] bg-white/[0.03]"
              style={{
                left: x * (cellW + gap),
                top: y * (cellH + gap),
                width: cellW,
                height: cellH,
              }}
            />
          );
        })}

      {mode === "edit" &&
        emptyCells.map(({ x, y }) => (
          <button
            key={`empty-${x}-${y}`}
            type="button"
            onClick={() => onCellClick?.(x, y)}
            className="group absolute flex items-center justify-center rounded-xl border border-transparent transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
            style={{
              left: x * (cellW + gap),
              top: y * (cellH + gap),
              width: cellW,
              height: cellH,
            }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/0 text-lg text-indigo-300 opacity-0 transition group-hover:bg-indigo-500/20 group-hover:opacity-100">
              +
            </span>
          </button>
        ))}

      {widgets.map((widget) => {
        const Icon = WIDGET_ICONS[widget.type];
        const label = getCatalogItem(widget.type).label;

        return (
          <div
            key={widget.id}
            className={`absolute overflow-hidden rounded-xl border bg-gradient-to-br from-white/[0.08] to-white/[0.03] ${
              mode === "edit"
                ? "border-indigo-400/30 shadow-lg shadow-indigo-500/10"
                : "border-white/10"
            }`}
            style={widgetStyle(widget, metrics)}
          >
            {mode === "edit" && (
              <div
                className="relative z-20 flex cursor-grab items-center justify-between border-b border-white/10 bg-black/20 px-2 pb-1 pt-2.5 active:cursor-grabbing"
                onMouseDown={(e) => startDrag(widget, e)}
              >
                <GripHorizontal size={14} className="text-gray-500" />
                <button
                  type="button"
                  onClick={() => onRemoveWidget?.(widget.id)}
                  className="rounded p-1 text-gray-500 transition hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            <div className="pointer-events-none relative z-0 flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
              <Icon size={22} className="text-indigo-300/80" />
              <span className="text-xs font-medium text-gray-300">{label}</span>
              {mode === "view" && (
                <span className="text-[10px] text-gray-600">Coming soon</span>
              )}
            </div>

            {mode === "edit" &&
              INVISIBLE_RESIZE_ZONES.map(({ handle, className: zoneClass }) => (
                <div
                  key={handle}
                  role="presentation"
                  aria-hidden
                  onMouseDown={(e) => startResize(widget, handle, e)}
                  className={`absolute ${zoneClass}`}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
