import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Member = {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  phone: string | null;
  memberStatus: "active" | "pending" | "suspended";
  isAdmin: boolean;
  invitesRemaining: number;
  invitedBy: string | null;
  invitedCount: number;
  missing: string[];
  createdAt: string;
};

type Tab = "pending" | "active" | "suspended" | "";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "En espera" },
  { key: "active", label: "Activos" },
  { key: "suspended", label: "Suspendidos" },
  { key: "", label: "Todos" },
];

const MISSING_LABEL: Record<string, string> = {
  firstName: "sin nombre",
  lastName: "sin apellido",
  photo: "sin foto",
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

function avatarSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith("/objects/") ? `/api/storage${url}` : url;
}

const ghostBtn = "rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700";

export default function AdminComunidad() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["admin-community", tab],
    queryFn: () =>
      api(`/admin/community/members${tab ? `?status=${tab}` : ""}`) as Promise<{
        counts: { pending: number; active: number; suspended: number };
        members: Member[];
      }>,
  });

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin-community"] });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const setStatus = (m: Member, status: Member["memberStatus"]) =>
    run(() => api(`/admin/community/members/${m.id}/status`, "POST", { status }));

  const generate = async () => {
    setError("");
    try {
      const d = await api("/admin/community/invites", "POST");
      setNewCode(d.code);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loadError) {
    const msg = (loadError as Error).message;
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-red-600">
          {msg === "Admin access required" ? "No tenés permisos de administrador." : msg}
        </p>
        <Link href="/" className="text-sm underline">Volver al inicio</Link>
      </div>
    );
  }

  const count = (k: Tab) => (k && data ? data.counts[k] : undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/admin" className="text-2xl leading-none text-gray-500" aria-label="Volver">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Comunidad</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">Invitación de administrador</p>
          <p className="mt-1 text-sm text-gray-500">Para sumar a los primeros vecinos. Vence en 30 días y sirve para una persona.</p>
          <button onClick={generate} className="mt-3 rounded-xl bg-[#1A8EA3] px-4 py-2 text-sm font-semibold text-white">
            Generar invitación
          </button>
          {newCode && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3">
              <p className="font-mono text-lg font-bold tracking-wider">{newCode}</p>
              <p className="mt-1 break-all text-xs text-gray-500">{`${window.location.origin}/i/${newCode}`}</p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Te invito a Monte Carpooling, la app para compartir viajes entre vecinos de Monte: ${window.location.origin}/i/${newCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-[#1A8EA3] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Enviar por WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.key ? "bg-[#1A8EA3] text-white" : "border border-gray-300 bg-white text-gray-600"}`}
            >
              {t.label}
              {count(t.key) !== undefined ? ` (${count(t.key)})` : ""}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
        {data && data.members.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">No hay personas en esta lista.</p>
        )}

        {data?.members.map((m) => {
          const src = avatarSrc(m.avatarUrl);
          return (
            <div key={m.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {src ? (
                  <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {m.name}
                    {m.isAdmin && <span className="ml-2 rounded bg-[#1A8EA3]/10 px-1.5 py-0.5 text-[10px] text-[#1A8EA3]">Admin</span>}
                  </p>
                  <p className="text-xs text-gray-500">{m.username}{m.phone ? `, tel. ${m.phone}` : ""}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {m.invitedBy ? `Invitado por ${m.invitedBy}` : "Sin invitación"}
                    {m.invitedCount > 0 ? `. Invitó a ${m.invitedCount}` : ""}
                    {`. Le quedan ${m.invitesRemaining} invitaciones`}
                  </p>
                  {m.missing.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700">Perfil incompleto: {m.missing.map((x) => MISSING_LABEL[x] ?? x).join(", ")}</p>
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">Se registró el {new Date(m.createdAt).toLocaleDateString("es-AR")}</p>
                </div>
              </div>

              {!m.isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.memberStatus === "pending" && (
                    <>
                      <button className={ghostBtn + " border-green-300 text-green-700"} onClick={() => setStatus(m, "active")}>Aprobar</button>
                      <button
                        className={ghostBtn + " text-red-600"}
                        onClick={() => { if (confirm(`¿Rechazar a ${m.name}? Queda suspendido.`)) setStatus(m, "suspended"); }}
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {m.memberStatus === "active" && (
                    <>
                      <button
                        className={ghostBtn + " text-red-600"}
                        onClick={() => { if (confirm(`¿Suspender a ${m.name}? También se anulan sus invitaciones sin usar.`)) setStatus(m, "suspended"); }}
                      >
                        Suspender
                      </button>
                      <button className={ghostBtn} onClick={() => run(() => api(`/admin/community/members/${m.id}/invites`, "POST", { add: 3 }))}>
                        Dar 3 invitaciones
                      </button>
                    </>
                  )}
                  {m.memberStatus === "suspended" && (
                    <button className={ghostBtn + " border-green-300 text-green-700"} onClick={() => setStatus(m, "active")}>Reactivar</button>
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
