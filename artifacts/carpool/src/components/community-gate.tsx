import { useEffect, useRef, useState, type ReactNode } from "react";

export interface CommunityStatus {
  status: "active" | "pending" | "suspended";
  isAdmin: boolean;
  missing: string[];
  invitedBy: string | null;
  invitesRemaining: number;
  openInvites?: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

const INVITE_KEY = "monte-invite-code";

export function saveInviteCode(code: string) {
  try {
    localStorage.setItem(INVITE_KEY, code);
  } catch {
    /* sin almacenamiento: el usuario puede escribir el código a mano */
  }
}

function readInviteCode(): string | null {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

function clearInviteCode() {
  try {
    localStorage.removeItem(INVITE_KEY);
  } catch {
    /* nada */
  }
}

export function needsCommunityGate(s?: CommunityStatus): boolean {
  if (!s || s.isAdmin) return false;
  return s.status !== "active" || s.missing.length > 0;
}

const primaryBtn =
  "w-full rounded-2xl py-3.5 text-base font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50";
const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[#1A8EA3]";

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-background px-6 py-10 text-foreground">
      {children}
      <a href="/api/logout" className="mt-8 text-center text-sm text-muted-foreground underline">
        Salir y entrar con otra cuenta
      </a>
    </div>
  );
}

export function CommunityGate({
  status,
  loading,
  onDone,
}: {
  status?: CommunityStatus;
  loading: boolean;
  onDone: () => void;
}) {
  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-14 w-14 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "#1A8EA3", borderTopColor: "transparent" }}
        />
      </div>
    );
  }
  if (status.status === "suspended") return <Suspended />;
  if (status.status === "pending") return <Pending onDone={onDone} />;
  return <CompleteProfile status={status} onDone={onDone} />;
}

function Suspended() {
  return (
    <Screen>
      <h1 className="text-2xl font-extrabold">Tu cuenta está suspendida</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No podés usar Monte Carpooling por ahora. Si creés que es un error, escribinos a{" "}
        <a href="mailto:monte.carpooling@elherlab.com" className="underline">monte.carpooling@elherlab.com</a>.
      </p>
    </Screen>
  );
}

function Pending({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(readInviteCode() ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  const redeem = async (c: string) => {
    const clean = c.trim().toUpperCase();
    if (!clean) {
      setError("Escribí el código de tu invitación.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/community/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json().catch(() => ({}));
      clearInviteCode();
      if (!res.ok) {
        setError(data.error || "No pudimos validar el código.");
        return;
      }
      onDone();
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const stored = readInviteCode();
    if (stored && !autoTried.current) {
      autoTried.current = true;
      redeem(stored);
    }
  }, []);

  return (
    <Screen>
      <h1 className="text-2xl font-extrabold">Monte Carpooling es una comunidad de vecinos</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Para entrar necesitás la invitación de alguien que ya la use. Pedile su link o su código.
      </p>
      <div className="mt-6 space-y-3">
        <input
          className={inputCls + " font-mono tracking-widest uppercase"}
          placeholder="MONTE-XXXXXX"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className={primaryBtn}
          style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          disabled={busy}
          onClick={() => redeem(code)}
        >
          {busy ? "Validando…" : "Entrar con mi invitación"}
        </button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        ¿No conocés a nadie que la use? Escribinos a{" "}
        <a href="mailto:monte.carpooling@elherlab.com" className="underline">monte.carpooling@elherlab.com</a>{" "}
        y revisamos tu solicitud.
      </p>
    </Screen>
  );
}

function CompleteProfile({ status, onDone }: { status: CommunityStatus; onDone: () => void }) {
  const [firstName, setFirstName] = useState(status.firstName ?? "");
  const [lastName, setLastName] = useState(status.lastName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    status.avatarUrl?.startsWith("/objects/uploads/") ? status.avatarUrl : null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Elegí una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const r1 = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const d1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(d1.error || "No se pudo subir la foto.");
      const r2 = await fetch(d1.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!r2.ok) {
        const d2 = await r2.json().catch(() => ({}));
        throw new Error(d2.error || "No se pudo subir la foto.");
      }
      setAvatarUrl(d1.objectPath);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !avatarUrl) {
      setError("Completá nombre, apellido y foto.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), avatarUrl }),
      });
      if (!res.ok) throw new Error("No pudimos guardar tu perfil.");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {status.invitedBy && (
        <p className="mb-2 text-sm font-medium text-[#1A8EA3]">Te invitó {status.invitedBy}</p>
      )}
      <h1 className="text-2xl font-extrabold">Completá tu perfil</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Los vecinos van a ver tu nombre y tu foto antes de compartir un viaje con vos. Usá una foto donde se vea bien tu cara.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <label className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#1A8EA3] bg-muted">
          {avatarUrl ? (
            <img src={`/api/storage${avatarUrl}`} alt="Tu foto" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-xs text-muted-foreground">
              {uploading ? "Subiendo…" : "Tocá para subir tu foto"}
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </label>
        {avatarUrl && <span className="text-xs text-muted-foreground">Tocá la foto para cambiarla</span>}
      </div>

      <div className="mt-6 space-y-3">
        <input className={inputCls} placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input className={inputCls} placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className={primaryBtn}
          style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          disabled={saving || uploading}
          onClick={save}
        >
          {saving ? "Guardando…" : "Guardar y entrar"}
        </button>
      </div>
    </Screen>
  );
}
