import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  mapsUrl, trackSponsorEvent, whatsappUrl,
  type SponsorPlacement, type SponsorSlotName,
} from "@/lib/sponsors";

interface Props {
  slot: SponsorSlotName;
  zone?: string;
  className?: string;
}

export default function SponsorSlot({ slot, zone, className = "" }: Props) {
  const { data } = useQuery({
    queryKey: ["sponsor-slot", slot, zone ?? ""],
    queryFn: async (): Promise<SponsorPlacement | null> => {
      const q = zone ? `?zone=${encodeURIComponent(zone)}` : "";
      const res = await fetch(`/api/sponsors/slot/${slot}${q}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.placement ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) trackSponsorEvent(data.placementId, slot === "trip_coupon" ? "coupon_shown" : "view", true);
  }, [data?.placementId, slot]);

  if (!data) return null;

  const maps = mapsUrl(data);
  const label = slot === "trip_coupon" ? "Beneficio por viajar" : "Patrocinado";

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        {label}
      </span>
      <div className="mt-2 flex items-start gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A8EA3]/10 text-lg font-bold text-[#1A8EA3]">
            {data.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{data.headline || data.name}</p>
          {data.headline && <p className="text-xs text-gray-500">{data.name}</p>}
          {(data.body || data.address) && <p className="mt-0.5 text-sm text-gray-600">{data.body || data.address}</p>}
        </div>
      </div>

      {data.couponText && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-[#1A8EA3] p-3 text-center text-lg font-bold text-[#1A8EA3]">
          {data.couponText}
        </div>
      )}

      {(data.whatsapp || maps) && (
        <div className="mt-3 flex gap-2">
          {data.whatsapp && (
            <a
              href={whatsappUrl(data.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSponsorEvent(data.placementId, "click_whatsapp")}
              className="flex-1 rounded-xl bg-[#1A8EA3] py-2 text-center text-sm font-semibold text-white"
            >
              WhatsApp
            </a>
          )}
          {maps && (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSponsorEvent(data.placementId, "click_map")}
              className="flex-1 rounded-xl border border-gray-300 py-2 text-center text-sm font-semibold text-gray-700"
            >
              Cómo llegar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
