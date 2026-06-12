import { GRID_COLS, GRID_ROWS, WIDGET_CATALOG } from "./constants";
import { ProfileWidget, WidgetType } from "./types";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function isCellOccupied(
  widgets: ProfileWidget[],
  x: number,
  y: number,
  excludeId?: string
): boolean {
  return widgets.some((widget) => {
    if (excludeId && widget.id === excludeId) return false;
    return (
      x >= widget.x &&
      x < widget.x + widget.w &&
      y >= widget.y &&
      y < widget.y + widget.h
    );
  });
}

export function canPlace(
  widgets: ProfileWidget[],
  x: number,
  y: number,
  w: number,
  h: number,
  excludeId?: string
): boolean {
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > GRID_ROWS) return false;

  for (let cy = y; cy < y + h; cy++) {
    for (let cx = x; cx < x + w; cx++) {
      if (isCellOccupied(widgets, cx, cy, excludeId)) return false;
    }
  }
  return true;
}

export function findPlacement(
  widgets: ProfileWidget[],
  type: WidgetType
): { x: number; y: number; w: number; h: number } | null {
  const catalog = WIDGET_CATALOG.find((item) => item.type === type)!;

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      for (const w of [catalog.defaultW, catalog.maxW, catalog.minW]) {
        for (const h of [catalog.defaultH, catalog.maxH, catalog.minH]) {
          if (canPlace(widgets, x, y, w, h)) {
            return { x, y, w, h };
          }
        }
      }
    }
  }
  return null;
}

/** Place a widget with the clicked cell as any corner (NW/NE/SW/SE anchor). */
export function findPlacementAtCell(
  widgets: ProfileWidget[],
  type: WidgetType,
  cell: { x: number; y: number }
): { x: number; y: number; w: number; h: number } | null {
  const catalog = WIDGET_CATALOG.find((item) => item.type === type)!;
  const sizeOptions = [
    { w: catalog.defaultW, h: catalog.defaultH },
    { w: catalog.minW, h: catalog.minH },
  ];

  const anchors = [
    (w: number, h: number) => ({ x: cell.x, y: cell.y }),
    (w: number, h: number) => ({ x: cell.x - w + 1, y: cell.y }),
    (w: number, h: number) => ({ x: cell.x, y: cell.y - h + 1 }),
    (w: number, h: number) => ({ x: cell.x - w + 1, y: cell.y - h + 1 }),
  ];

  for (const { w, h } of sizeOptions) {
    for (const anchor of anchors) {
      const { x, y } = anchor(w, h);
      if (canPlace(widgets, x, y, w, h)) {
        return { x, y, w, h };
      }
    }
  }

  return null;
}

export function clampWidgetSize(
  widget: ProfileWidget,
  w: number,
  h: number
): { w: number; h: number } {
  const catalog = WIDGET_CATALOG.find((item) => item.type === widget.type)!;
  return {
    w: Math.min(catalog.maxW, Math.max(catalog.minW, w)),
    h: Math.min(catalog.maxH, Math.max(catalog.minH, h)),
  };
}

export function computeResizeGeometry(
  handle: ResizeHandle,
  origin: { x: number; y: number; w: number; h: number },
  dx: number,
  dy: number,
  limits: { minW: number; minH: number; maxW: number; maxH: number }
): { x: number; y: number; w: number; h: number } {
  let x = origin.x;
  let y = origin.y;
  let w = origin.w;
  let h = origin.h;

  switch (handle) {
    case "se":
      w = origin.w + dx;
      h = origin.h + dy;
      break;
    case "nw":
      x = origin.x + dx;
      y = origin.y + dy;
      w = origin.w - dx;
      h = origin.h - dy;
      break;
    case "ne":
      y = origin.y + dy;
      w = origin.w + dx;
      h = origin.h - dy;
      break;
    case "sw":
      x = origin.x + dx;
      w = origin.w - dx;
      h = origin.h + dy;
      break;
    case "n":
      y = origin.y + dy;
      h = origin.h - dy;
      break;
    case "s":
      h = origin.h + dy;
      break;
    case "w":
      x = origin.x + dx;
      w = origin.w - dx;
      break;
    case "e":
      w = origin.w + dx;
      break;
  }

  const clampedW = Math.min(limits.maxW, Math.max(limits.minW, w));
  const clampedH = Math.min(limits.maxH, Math.max(limits.minH, h));

  const affectsWest = handle === "w" || handle === "nw" || handle === "sw";
  const affectsNorth = handle === "n" || handle === "nw" || handle === "ne";

  if (affectsWest) x = origin.x + origin.w - clampedW;
  if (affectsNorth) y = origin.y + origin.h - clampedH;

  return { x, y, w: clampedW, h: clampedH };
}
