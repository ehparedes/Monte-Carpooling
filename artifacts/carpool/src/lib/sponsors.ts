export type SponsorSlotName = "home_banner" | "guide_listing" | "guide_featured" | "meeting_point" | "trip_coupon";
export type SponsorEventType = "view" | "click_whatsapp" | "click_map" | "click_web" | "coupon_shown";

export interface SponsorPlacement {
  placementId: number;
  slot: SponsorSlotName;
  headline: string | null;
  body: string | null;
  couponText: string | null;
  zone: string | null;
  sponsorId: number;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  whatsapp: string | null;
  website: string | null;
  logoUrl: string | null;
  lat: number | null;
  lng: number | null;
  featured?: boolean;
}

export function trackSponsorEvent(placementId: number, type: SponsorEventType, oncePerSession = false) {
  const key = `sp-${placementId}-${type}`;
  try {
    if (oncePerSession) {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
  } catch {
    /* sin sessionStorage: se registra igual */
  }
  fetch("/api/sponsors/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementId, type }),
    keepalive: true,
  }).catch(() => {});
}

export function whatsappUrl(n: string): string {
  return `https://wa.me/${n.replace(/\D/g, "")}`;
}

export function mapsUrl(p: Pick<SponsorPlacement, "lat" | "lng" | "address">): string | null {
  if (p.lat != null && p.lng != null) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  if (p.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address + ", San Miguel del Monte")}`;
  return null;
}
