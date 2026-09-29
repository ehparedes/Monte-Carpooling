import { useEffect, useState } from "react";
import { saveInviteCode } from "@/components/community-gate";

export default function Invitacion({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params?.code ?? "").trim().toUpperCase();
  const [info, setInfo] = useState<{ valid: boolean; inviterName?: string | null } | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/community/invite/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        if (d.valid) saveInviteCode(code);
      })
      .catch(() => setInfo({ valid: false }));
    fetch("/api/auth/user", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.user))
      .catch(() => {});
  }, [code]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-background px-6 py-10 text-foreground">
      <img src="/images/logo-mark.png" alt="" className="mb-6 h-16 w-16 rounded-2xl" />

      {!info && <p className="text-sm text-muted-foreground">Revisando tu invitación…</p>}

      {info && info.valid && (
        <>
          <h1 className="text-2xl font-extrabold">
            {info.inviterName ? `${info.inviterName} te invitó a Monte Carpooling` : "Te invitaron a Monte Carpooling"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            La app para compartir viajes entre vecinos de San Miguel del Monte. Entrás con tu cuenta de Google y tu invitación se aplica sola.
          </p>
          <a
            href={loggedIn ? "/" : "/api/login?returnTo=%2F"}
            className="mt-6 block w-full rounded-2xl py-3.5 text-center text-base font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          >
            {loggedIn ? "Continuar" : "Entrar con Google"}
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            Al ingresar aceptás los <a href="/terminos.html" className="underline">términos</a> y la{" "}
            <a href="/privacidad.html" className="underline">política de privacidad</a>.
          </p>
        </>
      )}

      {info && !info.valid && (
        <>
          <h1 className="text-2xl font-extrabold">Esta invitación no es válida</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ya se usó, se anuló o venció. Pedile un link nuevo a quien te invitó.
          </p>
        </>
      )}
    </div>
  );
}
