import { Link } from "wouter";
import { IosInstallGuide, OpenInSafari, isIOS, isIOSNonSafari, isStandalone } from "@/components/install-prompt";

export default function Instalar() {
  const standalone = isStandalone();
  const ios = isIOS();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 py-8 text-foreground">
      <Link href="/" className="mb-4 text-sm text-muted-foreground underline">← Volver</Link>
      <h1 className="text-2xl font-extrabold">Instalar Monte Carpooling</h1>

      {standalone ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ya estás usando la app instalada. No tenés que hacer nada más.
        </p>
      ) : ios ? (
        <>
          <p className="mt-3 mb-4 text-sm text-muted-foreground">
            En iPhone se instala desde Safari, en pocos pasos. Queda con su ícono en la pantalla de inicio y se abre como cualquier app.
          </p>
          {isIOSNonSafari() ? <OpenInSafari inline /> : <IosInstallGuide inline />}
        </>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>En Android, desde Chrome:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tocá los tres puntitos <strong>⋮</strong>, arriba a la derecha.</li>
            <li>Tocá <strong>Instalar app</strong> (o <strong>Agregar a pantalla principal</strong>).</li>
            <li>Confirmá con <strong>Instalar</strong>.</li>
          </ol>
          <p>Después abrí Monte Carpooling desde el ícono nuevo.</p>
        </div>
      )}
    </div>
  );
}
