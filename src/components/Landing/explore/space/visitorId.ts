const VISITOR_KEY = "landing-visitor-id";
const SPOTLIGHT_KEY = "landing-painting-spotlight";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getSpotlightPaintingId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SPOTLIGHT_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function setSpotlightPaintingId(id: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPOTLIGHT_KEY, String(id));
}

export function clearSpotlightPaintingId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SPOTLIGHT_KEY);
}
