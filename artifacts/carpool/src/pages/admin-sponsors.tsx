import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SLOT_LABELS: Record<string, string> = {
  home_banner: "Banner de inicio",
  guide_listing: "Guía (básico)",
  guide_featured: "Guía (destacado)",
  meeting_point: "Punto de encuentro",
  trip_coupon: "Cupón al terminar viaje",
};

type Placement = {
  id: number; sponsorId: number; slot: string; headline: string | null; body: string | null;
  couponText: string | null; zone: string | null; startsAt: string; endsAt: string; active: boolean; priority: number;
};
type Sponsor = {
  id: number; name: string; category: string; description: string | null; address: string | null;
  whatsapp: string | null; website: string | null; lat: number | null; lng: number | null; active: boolean;
  placements: Placement[];
};

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const inputCls = "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1A8EA3]";
const primaryBtn = "rounded-xl bg-[#1A8EA3] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const ghostBtn = "rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700";
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d); };
const nullIfEmpty = (v: string) => (v.trim() === "" ? null : v.trim());
const numOrNull = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? null : Number(v));

type Run = (fn: () => Promise<unknown>) => Promise<void>;

export default function AdminSponsors() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["admin-sponsors"],
    queryFn: () => api("/admin/sponsors") as Promise<{ today: string; sponsors: Sponsor[] }>,
  });

  const run: Run = async (fn) => {
    setError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin-sponsors"] });
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (loadError) {
    const msg = (loadError as Error).message;
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-red-600">
          {msg === "Admin access required"
            ? "No tenés permisos de administrador."
            : msg === "Unauthorized"
              ? "Tenés que iniciar sesión."
              : msg}
        </p>
        <Link href="/" className="text-sm underline">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/admin" className="text-2xl leading-none text-gray-500" aria-label="Volver">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Sponsors</h1>
        <Link href="/guia" className="ml-auto text-sm text-[#1A8EA3] underline">Ver guía</Link>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <NewSponsorForm onCreate={(body) => run(() => api("/admin/sponsors", "POST", body))} />

        {data?.sponsors.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">Todavía no cargaste comercios.</p>
        )}

        {data?.sponsors.map((s) => (
          <SponsorCard key={s.id} s={s} today={data.today} run={run} />
        ))}

        <Report />
      </div>
    </div>
  );
}

function NewSponsorForm({ onCreate }: { onCreate: (body: unknown) => Promise<void> }) {
  const empty = { name: "", category: "", address: "", whatsapp: "", website: "", description: "", lat: "", lng: "" };
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  if (!open) {
    return <button onClick={() => setOpen(true)} className={primaryBtn + " w-full"}>Nuevo comercio</button>;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">Nuevo comercio</p>
      <input className={inputCls} placeholder="Nombre (ej. Panadería La Espiga)" value={f.name} onChange={set("name")} />
      <input className={inputCls} placeholder="Rubro (ej. Panadería)" value={f.category} onChange={set("category")} />
      <input className={inputCls} placeholder="Dirección (ej. Belgrano 450)" value={f.address} onChange={set("address")} />
      <input className={inputCls} placeholder="WhatsApp con código de país (ej. 5492271123456)" value={f.whatsapp} onChange={set("whatsapp")} />
      <input className={inputCls} placeholder="Sitio web o Instagram (opcional)" value={f.website} onChange={set("website")} />
      <textarea className={inputCls} rows={2} placeholder="Descripción corta (opcional)" value={f.description} onChange={set("description")} />
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Latitud (opcional)" value={f.lat} onChange={set("lat")} />
        <input className={inputCls} placeholder="Longitud (opcional)" value={f.lng} onChange={set("lng")} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => { setOpen(false); setF(empty); }} className={ghostBtn}>Cancelar</button>
        <button
          className={primaryBtn}
          disabled={!f.name.trim() || !f.category.trim()}
          onClick={async () => {
            await onCreate({
              name: f.name.trim(), category: f.category.trim(),
              address: nullIfEmpty(f.address), whatsapp: nullIfEmpty(f.whatsapp), website: nullIfEmpty(f.website),
              description: nullIfEmpty(f.description), lat: numOrNull(f.lat), lng: numOrNull(f.lng),
            });
            setF(empty);
            setOpen(false);
          }}
        >
          Guardar comercio
        </button>
      </div>
    </div>
  );
}

function SponsorCard({ s, today, run }: { s: Sponsor; today: string; run: Run }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${s.active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{s.name}</p>
          <p className="text-xs text-gray-500">
            {s.category}
            {s.address ? `, ${s.address}` : ""}
            {s.whatsapp ? ` (WhatsApp ${s.whatsapp})` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button className={ghostBtn} onClick={() => run(() => api(`/admin/sponsors/${s.id}`, "PUT", { active: !s.active }))}>
            {s.active ? "Pausar" : "Activar"}
          </button>
          <button
            className={ghostBtn + " text-red-600"}
            onClick={() => {
              if (confirm(`¿Eliminar ${s.name} y todos sus espacios?`)) run(() => api(`/admin/sponsors/${s.id}`, "DELETE"));
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {s.placements.map((p) => {
          const live = p.active && p.startsAt <= today && p.endsAt >= today;
          const expired = p.endsAt < today;
          const badge = live
            ? "bg-green-100 text-green-800"
            : expired ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600";
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {SLOT_LABELS[p.slot] ?? p.slot}
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${badge}`}>
                    {live ? "En vivo" : expired ? "Vencido" : p.active ? "Programado" : "Pausado"}
                  </span>
                </p>
                <p className="truncate text-xs text-gray-500">
                  Del {p.startsAt} al {p.endsAt}
                  {p.zone ? `, zona ${p.zone}` : ""}
                  {p.headline ? `: ${p.headline}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className={ghostBtn} onClick={() => run(() => api(`/admin/placements/${p.id}`, "PUT", { endsAt: plusDays(30) }))}>
                  Extender 30 días
                </button>
                <button className={ghostBtn} onClick={() => run(() => api(`/admin/placements/${p.id}`, "PUT", { active: !p.active }))}>
                  {p.active ? "Pausar" : "Activar"}
                </button>
                <button
                  className={ghostBtn + " text-red-600"}
                  aria-label="Eliminar espacio"
                  onClick={() => {
                    if (confirm("¿Eliminar este espacio?")) run(() => api(`/admin/placements/${p.id}`, "DELETE"));
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <NewPlacementForm
          onCancel={() => setAdding(false)}
          onCreate={async (body) => {
            await run(() => api(`/admin/sponsors/${s.id}/placements`, "POST", body));
            setAdding(false);
          }}
        />
      ) : (
        <button className={ghostBtn + " mt-3"} onClick={() => setAdding(true)}>Agregar espacio</button>
      )}
    </div>
  );
}

function NewPlacementForm({ onCreate, onCancel }: { onCreate: (body: unknown) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({
    slot: "guide_listing", headline: "", body: "", couponText: "", zone: "",
    startsAt: isoDate(new Date()), endsAt: plusDays(30), priority: "0",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-gray-300 p-3">
      <select className={inputCls} value={f.slot} onChange={set("slot")}>
        {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className={inputCls} placeholder="Título del aviso (opcional)" value={f.headline} onChange={set("headline")} />
      <input className={inputCls} placeholder="Texto (ej. Café gratis cargando más de 20 litros)" value={f.body} onChange={set("body")} />
      <input className={inputCls} placeholder="Cupón (ej. 15% off), opcional" value={f.couponText} onChange={set("couponText")} />
      <input className={inputCls} placeholder="Zona (solo para punto de encuentro, opcional)" value={f.zone} onChange={set("zone")} />
      <div className="flex gap-2">
        <label className="flex-1 text-xs text-gray-500">Desde<input type="date" className={inputCls} value={f.startsAt} onChange={set("startsAt")} /></label>
        <label className="flex-1 text-xs text-gray-500">Hasta<input type="date" className={inputCls} value={f.endsAt} onChange={set("endsAt")} /></label>
      </div>
      <label className="block text-xs text-gray-500">
        Prioridad (el número más alto aparece primero)
        <input type="number" min={0} max={100} className={inputCls} value={f.priority} onChange={set("priority")} />
      </label>
      <div className="flex justify-end gap-2">
        <button className={ghostBtn} onClick={onCancel}>Cancelar</button>
        <button
          className={primaryBtn}
          onClick={() => onCreate({
            slot: f.slot, headline: nullIfEmpty(f.headline), body: nullIfEmpty(f.body),
            couponText: nullIfEmpty(f.couponText), zone: nullIfEmpty(f.zone),
            startsAt: f.startsAt, endsAt: f.endsAt, priority: Number(f.priority) || 0,
          })}
        >
          Agregar espacio
        </button>
      </div>
    </div>
  );
}

function Report() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["admin-sponsors-report", month],
    queryFn: () => api(`/admin/sponsors/report?month=${month}`) as Promise<{ month: string; rows: Record<string, any>[] }>,
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">Reporte mensual</p>
        <div className="flex gap-2">
          <input type="month" className={inputCls + " w-auto"} value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className={ghostBtn} onClick={() => refetch()}>{isFetching ? "Cargando…" : "Actualizar"}</button>
        </div>
      </div>
      {!data?.rows.length ? (
        <p className="mt-3 text-sm text-gray-500">Sin actividad registrada en {month}.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gray-500">
              <tr>
                <th className="py-1 pr-2">Comercio</th>
                <th className="pr-2">Espacio</th>
                <th className="pr-2 text-right">Vistas</th>
                <th className="pr-2 text-right">WhatsApp</th>
                <th className="pr-2 text-right">Mapa</th>
                <th className="pr-2 text-right">Web</th>
                <th className="text-right">Cupón</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.placementId} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 font-medium">{r.sponsorName}</td>
                  <td className="pr-2 text-gray-500">{SLOT_LABELS[r.slot] ?? r.slot}</td>
                  <td className="pr-2 text-right">{r.view}</td>
                  <td className="pr-2 text-right">{r.click_whatsapp}</td>
                  <td className="pr-2 text-right">{r.click_map}</td>
                  <td className="pr-2 text-right">{r.click_web}</td>
                  <td className="text-right">{r.coupon_shown}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
