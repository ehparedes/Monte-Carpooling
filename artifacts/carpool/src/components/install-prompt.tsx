import { useEffect, useState, type ReactNode } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-prompt-dismissed-at";
const SNOOZE_ANDROID_MS = 7 * 24 * 60 * 60 * 1000;
const SNOOZE_IOS_MS = 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 3000;
const BRAND = "#1A8EA3";

// ---------- Detección ----------

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Navegadores de iPhone que no son Safari (Chrome, Firefox, Instagram, Facebook, etc.). */
export function isIOSNonSafari(): boolean {
  return /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|GSA\//i.test(navigator.userAgent);
}

/** Versión de Safari. Desde iOS 26 el botón Compartir está dentro del menú "···". */
function safariMajor(): number | null {
  const m = navigator.userAgent.match(/Version\/(\d+)/);
  return m ? Number(m[1]) : null;
}

function snoozed(ms: number): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < ms;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* modo privado */
  }
}

// ---------- Íconos ----------

function ShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

function PlusSquareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

// ---------- Ilustraciones de cada paso ----------

const hl = "rounded-lg bg-white ring-2 ring-offset-1 font-semibold";

function Mock({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-gray-100 p-3 text-gray-700">{children}</div>;
}

function Row({ active, icon, children }: { active?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm ${active ? hl : "text-gray-500"}`}
      style={active ? { color: BRAND, borderColor: BRAND, ["--tw-ring-color" as any]: BRAND } : undefined}
    >
      <span>{children}</span>
      {icon}
    </div>
  );
}

type Visual = "bar-menu" | "bar-share" | "menu-share" | "sheet-add" | "confirm-modern" | "confirm-classic" | "done";

function StepVisual({ visual }: { visual: Visual }) {
  const ring = { ["--tw-ring-color" as any]: BRAND, color: BRAND };
  switch (visual) {
    case "bar-menu":
      return (
        <Mock>
          <div className="flex items-center gap-2 text-lg">
            <span>‹</span>
            <span className="flex-1 truncate rounded-full bg-white px-3 py-1 text-xs text-gray-500">montecarpooling…</span>
            <span>↻</span>
            <span className={`px-2 ${hl}`} style={ring}>···</span>
          </div>
        </Mock>
      );
    case "bar-share":
      return (
        <Mock>
          <div className="flex items-center justify-around text-lg">
            <span>‹</span>
            <span>›</span>
            <span className={`p-1.5 ${hl}`} style={ring}><ShareIcon className="h-5 w-5" /></span>
            <span>▢</span>
            <span>⧉</span>
          </div>
        </Mock>
      );
    case "menu-share":
      return (
        <Mock>
          <Row active icon={<ShareIcon />}>Compartir</Row>
          <Row>Agregar a favoritos</Row>
          <Row>Buscar en la página</Row>
        </Mock>
      );
    case "sheet-add":
      return (
        <Mock>
          <Row>Copiar</Row>
          <Row>Agregar a la lista de lectura</Row>
          <Row active icon={<PlusSquareIcon />}>Agregar a inicio</Row>
        </Mock>
      );
    case "confirm-modern":
    case "confirm-classic":
      return (
        <Mock>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cancelar</span>
            <span className="font-semibold">Agregar a inicio</span>
            <span className={`px-2 py-0.5 ${hl}`} style={ring}>Agregar</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-2">
            <img src="/images/logo-mark.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm">Monte Carpooling</span>
          </div>
          {visual === "confirm-modern" && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2 text-sm">
              <span>Abrir como app web</span>
              <span className="flex h-5 w-9 items-center justify-end rounded-full bg-green-500 px-0.5">
                <span className="h-4 w-4 rounded-full bg-white" />
              </span>
            </div>
          )}
        </Mock>
      );
    case "done":
      return (
        <Mock>
          <div className="grid grid-cols-4 gap-3 p-1">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-xl bg-gray-300" />)}
            <div className="flex flex-col items-center gap-1">
              <img src="/images/logo-mark.png" alt="" className="aspect-square w-full rounded-xl ring-2" style={ring} />
            </div>
          </div>
          <p className="mt-1 text-center text-[11px] text-gray-500">Tu pantalla de inicio</p>
        </Mock>
      );
  }
}

// ---------- Guía de iPhone ----------

type Step = { title: string; text: string; visual: Visual; arrow?: "right" | "center" };

const STEPS: Record<"modern" | "classic", Step[]> = {
  modern: [
    { title: "Tocá los tres puntitos ···", text: "Están abajo a la derecha, al lado de la dirección de la página.", visual: "bar-menu", arrow: "right" },
    { title: "Tocá «Compartir»", text: "Es una de las primeras opciones del menú que se abre.", visual: "menu-share" },
    { title: "Tocá «Agregar a inicio»", text: "Deslizá la lista hacia arriba hasta encontrarla. Si no aparece, tocá «Ver más».", visual: "sheet-add" },
    { title: "Tocá «Agregar»", text: "Dejá activada la opción «Abrir como app web» y tocá «Agregar», arriba a la derecha.", visual: "confirm-modern" },
    { title: "¡Listo, ya la instalaste!", text: "Cerrá Safari y abrí Monte Carpooling desde el ícono nuevo de tu pantalla de inicio. Desde ahí funciona como cualquier app.", visual: "done" },
  ],
  classic: [
    { title: "Tocá el botón Compartir", text: "Es el cuadrado con una flecha hacia arriba, abajo en el centro de la pantalla.", visual: "bar-share", arrow: "center" },
    { title: "Tocá «Agregar a inicio»", text: "Deslizá la lista hacia arriba hasta encontrarla.", visual: "sheet-add" },
    { title: "Tocá «Agregar»", text: "Está arriba a la derecha.", visual: "confirm-classic" },
    { title: "¡Listo, ya la instalaste!", text: "Cerrá Safari y abrí Monte Carpooling desde el ícono nuevo de tu pantalla de inicio. Desde ahí funciona como cualquier app.", visual: "done" },
  ],
};

export function IosInstallGuide({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const initial = (safariMajor() ?? 26) >= 26 ? "modern" : "classic";
  const [variant, setVariant] = useState<"modern" | "classic">(initial);
  const [i, setI] = useState(0);
  const steps = STEPS[variant];
  const step = steps[i];
  const last = i === steps.length - 1;

  const card = (
    <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: BRAND }}>Instalá la app en tu iPhone · Paso {i + 1} de {steps.length}</p>
          <p className="mt-1 font-bold text-gray-900">{step.title}</p>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Cerrar" className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-gray-400">×</button>
        )}
      </div>

      <div className="mt-3"><StepVisual visual={step.visual} /></div>
      <p className="mt-3 text-sm text-gray-600">{step.text}</p>

      <div className="mt-3 flex gap-1">
        {steps.map((_, k) => (
          <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k <= i ? BRAND : "#e5e7eb" }} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => { setVariant(variant === "modern" ? "classic" : "modern"); setI(0); }}
          className="text-left text-xs text-gray-500 underline"
        >
          ¿Tu pantalla se ve distinta?
        </button>
        <div className="flex gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600">Atrás</button>
          )}
          <button
            onClick={() => (last ? onClose?.() : setI(i + 1))}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: BRAND }}
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) return card;

  return (
    <>
      <div className="fixed inset-x-0 z-[9999] flex justify-center px-3" style={{ bottom: step.arrow ? 56 : 12 }}>
        {card}
      </div>
      {step.arrow && (
        <div
          className={`pointer-events-none fixed bottom-1 z-[10000] animate-bounce text-4xl ${step.arrow === "right" ? "right-5" : "left-1/2 -translate-x-1/2"}`}
          style={{ color: BRAND }}
          aria-hidden="true"
        >
          ↓
        </div>
      )}
    </>
  );
}

// ---------- iPhone con otro navegador ----------

export function OpenInSafari({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      /* el usuario puede copiar la dirección a mano */
    }
  };
  const card = (
    <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-gray-900">Para instalar la app, abrila en Safari</p>
        {onClose && <button onClick={onClose} aria-label="Cerrar" className="-mr-1 -mt-1 p-1 text-xl leading-none text-gray-400">×</button>}
      </div>
      <p className="mt-2 text-sm text-gray-600">
        En iPhone, la app se instala desde Safari. Copiá el link, abrí Safari y pegalo en la barra de direcciones.
      </p>
      <button onClick={copy} className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>
        {copied ? "Link copiado: ahora abrí Safari" : "Copiar link"}
      </button>
    </div>
  );
  if (inline) return card;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
      {card}
    </div>
  );
}

// ---------- Cartel principal ----------

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"android" | "ios" | "ios-other" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const ios = isIOS();
    if (snoozed(ios ? SNOOZE_IOS_MS : SNOOZE_ANDROID_MS)) return;

    let timer: number | undefined;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMode("android"), SHOW_DELAY_MS);
    };
    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if (ios) timer = window.setTimeout(() => setMode(isIOSNonSafari() ? "ios-other" : "ios"), SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    snooze();
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setMode(null);
    if (outcome === "dismissed") snooze();
  };

  if (mode === "ios") return <IosInstallGuide onClose={close} />;
  if (mode === "ios-other") return <OpenInSafari onClose={close} />;
  if (mode !== "android") return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar Monte Carpooling"
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start gap-3">
          <img src="/images/logo-mark.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900">Instalá Monte Carpooling</p>
            <p className="mt-0.5 text-sm text-gray-600">
              Tenela en tu pantalla de inicio y abrila como una app, sin pasar por el navegador.
            </p>
          </div>
          <button onClick={close} aria-label="Cerrar" className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-gray-400">×</button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={close} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600">Ahora no</button>
          <button onClick={install} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND }}>
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
