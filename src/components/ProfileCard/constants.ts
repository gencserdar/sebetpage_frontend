import type { LucideIcon } from "lucide-react";
import { Link2, Image, MessageSquareQuote, Sparkles, Type } from "lucide-react";
import { WidgetCatalogItem, WidgetType } from "./types";

export const GRID_COLS = 4;
export const GRID_ROWS = 6;
export const CELL_SIZE_PX = 72;
export const GRID_GAP_PX = 8;

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    type: "bio",
    label: "Bio",
    description: "A short intro about you",
    defaultW: 4,
    defaultH: 2,
    minW: 2,
    minH: 1,
    maxW: 4,
    maxH: 3,
  },
  {
    type: "links",
    label: "Links",
    description: "Social & external links",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 1,
    maxW: 4,
    maxH: 3,
  },
  {
    type: "status",
    label: "Status",
    description: "What you're up to right now",
    defaultW: 2,
    defaultH: 1,
    minW: 1,
    minH: 1,
    maxW: 4,
    maxH: 2,
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Photos & highlights",
    defaultW: 2,
    defaultH: 3,
    minW: 2,
    minH: 2,
    maxW: 4,
    maxH: 4,
  },
  {
    type: "quote",
    label: "Quote",
    description: "A line that defines you",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 1,
    maxW: 4,
    maxH: 3,
  },
];

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  bio: Type,
  links: Link2,
  status: Sparkles,
  gallery: Image,
  quote: MessageSquareQuote,
};

export function getCatalogItem(type: WidgetType): WidgetCatalogItem {
  return WIDGET_CATALOG.find((item) => item.type === type)!;
}

export function fixedGridSize() {
  const gap = GRID_GAP_PX;
  const cell = CELL_SIZE_PX;
  return {
    cellW: cell,
    cellH: cell,
    gap,
    width: GRID_COLS * cell + (GRID_COLS - 1) * gap,
    height: GRID_ROWS * cell + (GRID_ROWS - 1) * gap,
  };
}

export function fitGridToContainer(container: HTMLElement) {
  const gap = GRID_GAP_PX;
  const maxW = container.clientWidth;
  const maxH = container.clientHeight;

  if (maxW <= 0 || maxH <= 0) {
    return fixedGridSize();
  }

  const cellW = Math.max(0, (maxW - (GRID_COLS - 1) * gap) / GRID_COLS);
  const cellH = Math.max(0, (maxH - (GRID_ROWS - 1) * gap) / GRID_ROWS);
  const width = GRID_COLS * cellW + (GRID_COLS - 1) * gap;
  const height = GRID_ROWS * cellH + (GRID_ROWS - 1) * gap;

  return { cellW, cellH, gap, width, height };
}
