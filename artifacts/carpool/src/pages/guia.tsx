import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { mapsUrl, trackSponsorEvent, whatsappUrl, type SponsorPlacement } from "@/lib/sponsors";

export default function Guia() {
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["sponsor-guide"],
    queryFn: async (): Promise<{ items: SponsorPlacement[]; categories: string[] }> => {
      const res = await fetch("/api/sponsors/guide");
      if (!res.ok) return { items: [], categories: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => !category || i.category === category),
    [data, category],
  );

  useEffect(() => {
    for (const i of items) trackSponsorEvent(i.placementId, "view", true);
  }, [items]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-[#1A8EA3] text-white" : "border border-gray-300 bg-white text-gray-600"}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/" className="text-2xl leading-none text-gray-500" aria-label="Volver">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Guía de Monte</h1>
      </div>

      <div className="mx-auto max-w-md space-y-3 p-4 pb-24">
        {(data?.categories.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory(null)} className={chip(!category)}>Todos</button>
            {data!.categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>{c}</button>
            ))}
          </div>
        )}

        {isLoading && <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>}

        {!isLoading && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="font-semibold text-gray-700">Pronto vas a encontrar acá los comercios de Monte</p>
            <p className="mt-1 text-sm text-gray-500">¿Tenés un comercio? Escribinos a monte.carpooling@elherlab.com</p>
          </div>
        )}

        {items.map((i) => {
          const maps = mapsUrl(i);
          return (
            <div
              key={i.sponsorId}
              className={`rounded-2xl bg-white p-4 ${i.featured ? "border-2 border-[#1A8EA3]" : "border border-gray-200"}`}
            >
              {i.featured && (
                <span className="mb-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Destacado
                </span>
              )}
              <div className="flex items-start gap-3">
                {i.logoUrl ? (
                  <img src={i.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A8EA3]/10 text-lg font-bold text-[#1A8EA3]">
                    {i.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{i.name}</p>
                  <p className="text-xs text-gray-500">{i.address ? `${i.category}, ${i.address}` : i.category}</p>
                  {(i.body || i.description) && <p className="mt-1 text-sm text-gray-600">{i.body || i.description}</p>}
                  {i.couponText && <p className="mt-1 text-sm font-semibold text-green-700">{i.couponText}</p>}
                </div>
              </div>
              {(i.whatsapp || maps || i.website) && (
                <div className="mt-3 flex gap-2">
                  {i.whatsapp && (
                    <a href={whatsappUrl(i.whatsapp)} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackSponsorEvent(i.placementId, "click_whatsapp")}
                      className="flex-1 rounded-xl bg-[#1A8EA3] py-2 text-center text-sm font-semibold text-white">
                      WhatsApp
                    </a>
                  )}
                  {maps && (
                    <a href={maps} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackSponsorEvent(i.placementId, "click_map")}
                      className="flex-1 rounded-xl border border-gray-300 py-2 text-center text-sm font-semibold text-gray-700">
                      Cómo llegar
                    </a>
                  )}
                  {i.website && !i.whatsapp && (
                    <a href={i.website} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackSponsorEvent(i.placementId, "click_web")}
                      className="flex-1 rounded-xl border border-gray-300 py-2 text-center text-sm font-semibold text-gray-700">
                      Sitio web
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
