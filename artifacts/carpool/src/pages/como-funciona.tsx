import { Link } from "wouter";
import { Search, Car, CheckCircle, MapPin, Star, UserPlus, MessageCircle, Shield } from "lucide-react";

const BRAND = "#1A8EA3";
const GREEN = "#3D7A28";

const steps = [
  {
    icon: Search,
    color: "#E85D2A",
    title: "¿Buscás viaje?",
    text: "Publicá tu solicitud con origen, destino y horario. Los conductores de Monte la van a ver.",
  },
  {
    icon: Car,
    color: BRAND,
    title: "¿Sos conductor?",
    text: "Mirá quién necesita viaje y ofrecete para llevarlo. También podés publicar tu viaje y que otros reserven.",
  },
  {
    icon: CheckCircle,
    color: GREEN,
    title: "Aceptá y listo",
    text: "Cuando el pasajero acepta tu oferta, se crea el viaje. Los dos lo ven en Mis viajes, con los datos del auto y el chat.",
  },
  {
    icon: MessageCircle,
    color: "#6366F1",
    title: "Coordiná por el chat",
    text: "Usá el chat del viaje para coordinar la hora y el punto de encuentro. Es privado entre conductor y pasajeros.",
  },
  {
    icon: MapPin,
    color: "#D4A520",
    title: "Iniciar y terminar",
    text: "Cuando arranca el viaje, cualquiera de los dos toca Iniciar. Al llegar, Viaje terminado. Le llega un aviso al otro.",
  },
  {
    icon: Star,
    color: "#F59E0B",
    title: "Calificá",
    text: "Después del viaje, calificá a tu compañero. Las calificaciones ayudan a que la comunidad se cuide.",
  },
  {
    icon: UserPlus,
    color: GREEN,
    title: "Invitá vecinos",
    text: "Cada miembro tiene 3 invitaciones para compartir por WhatsApp. Solo entran personas invitadas por alguien de Monte.",
  },
  {
    icon: Shield,
    color: BRAND,
    title: "Comunidad segura",
    text: "Todos entraron por invitación. Sabés quién invitó a quién. Patente y teléfono solo se comparten con el viaje confirmado.",
  },
];

export default function ComoFunciona() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Link href="/" className="text-2xl leading-none text-muted-foreground" aria-label="Volver">←</Link>
        <h1 className="text-lg font-bold">¿Cómo funciona esta app?</h1>
      </div>

      <div className="mx-auto max-w-md px-5 py-6 pb-24 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Monte Carpooling conecta vecinos que viajan para que compartan el auto. Así funciona:
        </p>

        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${step.color}15` }}
              >
                <Icon className="h-6 w-6" style={{ color: step.color }} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-sm">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.text}</p>
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl p-4 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${GREEN})` }}>
          <p className="font-bold">¿Tenés dudas?</p>
          <p className="text-sm text-white/80 mt-1">
            Escribinos a{" "}
            <a href="mailto:monte.carpooling@elherlab.com" className="underline">monte.carpooling@elherlab.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
