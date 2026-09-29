import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-prompt-dismissed-at";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 3000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < SNOOZE_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"install" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    let timer: number | undefined;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMode("install"), SHOW_DELAY_MS);
    };
    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if (isIOS()) timer = window.setTimeout(() => setMode("ios"), SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* modo privado: no pasa nada */
    }
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setMode(null);
    if (outcome === "dismissed") dismiss();
  };

  if (!mode) return null;

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
            {mode === "install" ? (
              <p className="mt-0.5 text-sm text-gray-600">
                Tenela en tu pantalla de inicio y abrila como una app, sin pasar por el navegador.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-gray-600">
                Tocá <strong>Compartir</strong> (el cuadrado con la flecha ↑) y después{" "}
                <strong>Agregar a inicio</strong>.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={dismiss} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Ahora no
          </button>
          {mode === "install" && (
            <button
              onClick={install}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1A8EA3" }}
            >
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
