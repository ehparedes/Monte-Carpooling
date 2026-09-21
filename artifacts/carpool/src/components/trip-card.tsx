import { Link } from "wouter";
import { MapPin, Calendar, Clock, Package, Users } from "lucide-react";
import { Trip } from "@workspace/api-client-react/src/generated/api.schemas";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { TRIP_STATUS_LABELS } from "@/lib/constants";
import { getApiUrl } from "@/lib/api";

function resolveAvatarUrl(rawUrl: string | null | undefined, fallbackSeed: string): string {
  if (!rawUrl) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`;
  if (rawUrl.startsWith("/objects/")) return getApiUrl("api/storage") + rawUrl;
  return rawUrl;
}

interface TripCardProps {
  trip: Trip & { priceType?: "fixed" | "free" | "optional" };
  hideBookButton?: boolean;
}

function PriceDisplay({ trip }: { trip: TripCardProps["trip"] }) {
  const type = (trip as any).priceType ?? "fixed";

  if (type === "free") {
    return (
      <div>
        <p className="text-sm text-muted-foreground font-medium">Precio</p>
        <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-extrabold text-lg border border-green-300">
          🤝 Gratis / Gauchada
        </span>
      </div>
    );
  }

  if (type === "optional") {
    return (
      <div>
        <p className="text-sm text-muted-foreground font-medium">Precio</p>
        <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-extrabold text-base border border-amber-300">
          🙏 A voluntad
        </span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground font-medium">Precio por lugar</p>
      <p className="text-2xl font-extrabold text-primary">$ {Number(trip.pricePerSeat).toLocaleString("es-AR")}</p>
    </div>
  );
}

export function TripCard({ trip, hideBookButton = false }: TripCardProps) {
  const getDicebearUrl = (name?: string | null) =>
    name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` : "";

  const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
    scheduled: "secondary",
    in_progress: "warning",
    completed: "success",
    cancelled: "destructive"
  };

  const priceType = (trip as any).priceType ?? "fixed";
  const canBook = trip.status === "scheduled" && trip.availableSeats > 0;

  return (
    <div className="bg-card rounded-3xl p-5 shadow-lg shadow-black/5 border border-border hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <Badge variant={statusColors[trip.status] || "default"} className="capitalize">
          {TRIP_STATUS_LABELS[trip.status] || trip.status}
        </Badge>
      </div>

      {/* Info del conductor */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-background shadow-sm">
          <img
            src={resolveAvatarUrl(trip.driverAvatarUrl, trip.driverName || `conductor-${trip.driverId}`)}
            alt="Conductor"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-bold text-foreground text-lg">{trip.driverName || "Conductor"}</h4>
          <div className="flex items-center gap-1 text-sm text-amber-500 font-medium">
            ★ {trip.driverRating ? trip.driverRating.toFixed(1) : "Nuevo"}
          </div>
        </div>
      </div>

      {/* Ruta */}
      <div className="flex items-stretch gap-4 mb-5">
        <div className="flex flex-col items-center py-1">
          <div className="w-3 h-3 rounded-full border-2 border-primary bg-background z-10" />
          <div className="w-0.5 h-10 bg-gradient-to-b from-primary to-secondary my-1" />
          <div className="w-3 h-3 rounded-full bg-secondary z-10" />
        </div>
        <div className="flex flex-col justify-between py-0.5">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Origen</p>
            <p className="font-bold text-foreground text-lg">{trip.origin}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Destino</p>
            <p className="font-bold text-foreground text-lg">{trip.destination}</p>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="mb-5">
        {/* Fecha y hora — destacadas */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2.5 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Fecha</p>
              <p className="text-base font-extrabold text-primary leading-tight">
                {format(parseISO(trip.date), "dd 'de' MMM", { locale: es })}
              </p>
              <p className="text-xs font-semibold text-primary/70">
                {format(parseISO(trip.date), "yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 bg-secondary/10 border border-secondary/20 rounded-2xl px-4 py-3">
            <Clock className="w-5 h-5 text-secondary shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-secondary/70 uppercase tracking-wider">Hora</p>
              <p className="text-base font-extrabold text-secondary leading-tight">{trip.time}</p>
              <p className="text-xs font-semibold text-secondary/70">salida</p>
            </div>
          </div>
        </div>
        {/* Punto de encuentro + lugares */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-2xl">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium truncate">{trip.meetingPoint}</span>
        </div>
        <div className="flex items-center gap-2 text-sm col-span-2">
          <Users className="w-4 h-4 shrink-0" style={{
            color: trip.availableSeats === 0 ? "#ef4444"
              : trip.availableSeats <= Math.ceil(trip.totalSeats / 2) ? "#f59e0b"
              : "#22c55e"
          }} />
          <div className="flex items-center gap-2 flex-1">
            <div className="flex gap-1">
              {Array.from({ length: trip.totalSeats }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: i < (trip.totalSeats - trip.availableSeats)
                      ? "rgba(0,0,0,0.15)" : "transparent",
                    borderColor: i < (trip.totalSeats - trip.availableSeats)
                      ? "rgba(0,0,0,0.2)"
                      : trip.availableSeats === 0 ? "#ef4444"
                      : trip.availableSeats <= Math.ceil(trip.totalSeats / 2) ? "#f59e0b"
                      : "#22c55e",
                  }}
                >
                  {i < (trip.totalSeats - trip.availableSeats) ? "✕" : ""}
                </div>
              ))}
            </div>
            <span
              className="font-bold text-xs"
              style={{
                color: trip.availableSeats === 0 ? "#ef4444"
                  : trip.availableSeats <= Math.ceil(trip.totalSeats / 2) ? "#f59e0b"
                  : "#22c55e"
              }}
            >
              {trip.availableSeats === 0
                ? "Sin lugares"
                : `${trip.availableSeats} libre${trip.availableSeats !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <PriceDisplay trip={trip} />
        {trip.acceptsPackages && (
          <Badge variant="outline" className="flex items-center gap-1 bg-background">
            <Package className="w-3 h-3" /> Encomiendas
          </Badge>
        )}
      </div>

      {!hideBookButton && (
        <Link href={`/trip/${trip.id}`} className="mt-5">
          <button
            disabled={!canBook}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
              ${priceType === "free" ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200" :
                priceType === "optional" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" :
                "bg-primary text-primary-foreground shadow-primary/25 hover:-translate-y-1 hover:shadow-xl"}
              active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {trip.availableSeats === 0 ? "Sin lugares" : trip.status !== "scheduled" ? "No disponible" : "Ver y reservar"}
          </button>
        </Link>
      )}
    </div>
  );
}
