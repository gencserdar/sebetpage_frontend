export type WidgetType = "bio" | "links" | "status" | "gallery" | "quote";

export interface ProfileWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProfileCardLayout {
  widgets: ProfileWidget[];
}

export interface WidgetCatalogItem {
  type: WidgetType;
  label: string;
  description: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
}
