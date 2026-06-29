import { getVisitorId } from "./visitorId";

export type LandingPainting = {
  id: number;
  visitorId: string;
  imageUrl: string;
  createdAt: number;
};

const VISITOR_HEADER = "X-Visitor-Id";

export async function listLandingPaintings(limit = 20): Promise<LandingPainting[]> {
  const res = await fetch(`/api/landing/paintings?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMyLandingPainting(): Promise<LandingPainting | null> {
  const res = await fetch("/api/landing/paintings/mine", {
    headers: { [VISITOR_HEADER]: getVisitorId() },
  });
  if (res.status === 204) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function uploadLandingPainting(file: Blob): Promise<LandingPainting> {
  const form = new FormData();
  form.append("file", file, "painting.png");
  const res = await fetch("/api/landing/paintings", {
    method: "POST",
    headers: { [VISITOR_HEADER]: getVisitorId() },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to send painting");
  }
  return res.json();
}
