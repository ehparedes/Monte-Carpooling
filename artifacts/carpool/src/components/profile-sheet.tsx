import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Star, Car, Package, MapPin, Calendar, Users } from "lucide-react";

function resolveAvatarUrl(rawUrl: string | null | undefined, username?: string | null): string {
  if (!rawUrl) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username || "user")}`;
  if (rawUrl.startsWith("/objects/")) return getApiUrl("api/storage") + rawUrl;
  return rawUrl;
}

function StarRating({ avg, total }: { avg: number | null; total: number }) {
  if (!avg || total === 0) return <span className="text-xs text-muted-foreground">Sin calificaciones aún</span>;
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-sm font-bold text-foreground">{avg.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({total} {total === 1 ? "opinión" : "opiniones"})</span>
    </div>
  );
}

export function ProfileSheet({
  profileId,
  onClose,
}: {
  profileId: number | null;
  onClose: () => void;
}) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", profileId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/users/${profileId}`), { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el perfil");
      return res.json();
    },
    enabled: profileId !== null,
  });

  const fullName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || profile.username
    : "";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : "";

  return (
    <Sheet open={profileId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-0 pb-10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-12 px-6">
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-40 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded-full" />
          </div>
        ) : profile ? (
          <div className="flex flex-col">
            {/* Header con avatar */}
            <div className="flex flex-col items-center pt-6 pb-5 px-6 border-b border-border">
              <img
                src={resolveAvatarUrl(profile.avatarUrl, profile.username)}
                alt={fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 mb-3"
              />
              <h2 className="text-xl font-extrabold text-foreground">{fullName}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>

              <div className="mt-2">
                <StarRating avg={profile.avgRating} total={profile.totalRatings} />
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Miembro desde {memberSince}</span>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3 px-6 py-5 border-b border-border">
              <div className="bg-primary/5 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-primary">{profile.tripsAsDriver ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.tripsAsDriver === 1 ? "Viaje como conductor" : "Viajes como conductor"}
                </p>
              </div>
              <div className="bg-secondary/5 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-secondary">{profile.tripsAsPassenger ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.tripsAsPassenger === 1 ? "Viaje como pasajero" : "Viajes como pasajero"}
                </p>
              </div>
            </div>

            {/* Info del vehículo (solo si es conductor) */}
            {profile.isDriver && (profile.vehicleModel || profile.vehicleColor) && (
              <div className="px-6 py-5 border-b border-border space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehículo</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {profile.vehicleModel && (
                      <p className="font-bold text-sm text-foreground">{profile.vehicleModel}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {profile.vehicleColor && (
                        <span className="text-xs text-muted-foreground">{profile.vehicleColor}</span>
                      )}
                      {profile.totalSeats && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {profile.totalSeats} {profile.totalSeats === 1 ? "asiento" : "asientos"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {profile.acceptsPackages && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
                    <Package className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Acepta encomiendas / paquetes</span>
                  </div>
                )}
              </div>
            )}

            {/* Badge conductor verificado */}
            {profile.isDriver && (
              <div className="px-6 pt-4">
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3">
                  <Car className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-bold text-primary">Conductor registrado en Monte Carpooling</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground px-6">
            No se pudo cargar el perfil.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
