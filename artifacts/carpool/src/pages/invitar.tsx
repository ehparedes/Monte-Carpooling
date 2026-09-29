import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Invite = {
  code: string;
  state: "open" | "used" | "revoked" | "expired";
  usedBy: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const STATE_LABEL: Record<Invite["state"], string> = {
  open: "Sin usar",
  used: "Usada",
  revoked: "Anulada",
  expired: "Vencida",
};

async function api(path: string, method = "GET") {
  const res = await fetch(`/api${path}`, { method, credentials: "include" });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function inviteLink(code: string) {
  return `${window.location.origin}/i/${code}`;
}

function whatsappShare(code: string) {
  const text = `Te invito a Monte Carpooling, la app para compartir viajes entre vecinos de Monte. Entrá con este link: ${inviteLink(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function Invitar() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () =>
      api("/community/invites") as Promise<{ unlimited: boolean; invitesRemaining: number; invites: Invite[] }>,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-invites"] });

  const create = async () => {
    setError("");
    try {
      await api("/community/invites", "POST");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const revoke = async (code: string) => {
    if (!confirm("¿Anular esta invitación? Se te devuelve para usarla con otra persona.")) return;
    setError("");
    try {
      await api(`/community/invites/${code}/revoke`, "POST");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No se pudo copiar. Mantené apretado el código para copiarlo.");
    }
  };

  const canCreate = data && (data.unlimited || data.invitesRemaining > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Link href="/profile" className="text-2xl leading-none text-muted-foreground" aria-label="Volver">←</Link>
        <h1 className="text-lg font-bold">Invitar vecinos</h1>
      </div>

      <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
        <p className="text-sm text-muted-foreground">
          Monte Carpooling es solo para vecinos. Invitá a gente que conozcas y en quien confíes: en su perfil va a figurar que la invitaste vos.
        </p>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {loadError && <p className="text-sm text-red-600">{(loadError as Error).message}</p>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {data && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {data.unlimited
                  ? "Como administrador, podés generar todas las invitaciones que necesites."
                  : `Te quedan ${data.invitesRemaining} ${data.invitesRemaining === 1 ? "invitación" : "invitaciones"}.`}
              </p>
              <button
                onClick={create}
                disabled={!canCreate}
                className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#1A8EA3" }}
              >
                Generar invitación
              </button>
            </div>

            {data.invites.map((i) => (
              <div key={i.code} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold tracking-wider">{i.code}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {STATE_LABEL[i.state]}
                  </span>
                </div>
                {i.state === "used" && i.usedBy && (
                  <p className="mt-1 text-sm text-muted-foreground">La usó {i.usedBy}</p>
                )}
                {i.state === "open" && (
                  <div className="mt-3 flex gap-2">
                    <a
                      href={whatsappShare(i.code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-xl py-2 text-center text-sm font-semibold text-white"
                      style={{ background: "#1A8EA3" }}
                    >
                      Enviar por WhatsApp
                    </a>
                    <button onClick={() => copy(i.code)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                      {copied === i.code ? "Copiado" : "Copiar link"}
                    </button>
                    <button onClick={() => revoke(i.code)} className="rounded-xl border border-border px-3 py-2 text-sm text-red-600">
                      Anular
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
