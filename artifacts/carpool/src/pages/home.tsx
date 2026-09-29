import SponsorSlot from "@/components/sponsor-slot";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { TripCard } from "@/components/trip-card";
import { ProfileSheet } from "@/components/profile-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOWNS } from "@/lib/constants";
import { Search, MapPin, Calendar as CalendarIcon, Car, HandHeart, Users, Trash2, Phone, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useSearchTrips } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@workspace/replit-auth-web";

const MONTE_COLORS = ["#D4A520", "#7A3428", "#1A8EA3", "#C22020", "#3D7A28"];
const MONTE_LETTERS = ["M", "o", "n", "t", "e"];

function TripRequestCard({
  request,
  isOwn,
  onDelete,
  onOffer,
  onRefresh,
}: {
  request: any;
  isOwn?: boolean;
  onDelete?: () => void;
  onOffer?: () => Promise<{ driverPhone?: string | null }>;
  onRefresh?: () => void;
}) {
  const [offered, setOffered] = useState(false);
  const [offering, setOffering] = useState(false);
  const [passengerWhatsapp, setPassengerWhatsapp] = useState<string | null>(null);
  const [showOffers, setShowOffers] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<number | null>(null);

  const pendingOffers = (request.offers || []).filter((o: any) => o.status === "pending");
  const hasOffers = pendingOffers.length > 0;

  const acceptOffer = useMutation({
    mutationFn: async (offerId: number) => {
      const res = await fetch(getApiUrl(`api/trip-request-offers/${offerId}/accept`), {
        method: "PATCH", credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast.success("¡Oferta aceptada! El conductor recibirá una notificación.");
      onRefresh?.();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo aceptar"),
  });

  const rejectOffer = useMutation({
    mutationFn: async (offerId: number) => {
      const res = await fetch(getApiUrl(`api/trip-request-offers/${offerId}/reject`), {
        method: "PATCH", credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast.success("Oferta rechazada.");
      onRefresh?.();
    },
    onError: (e: any) => toast.error(e.message || "No se pudo rechazar"),
  });

  const handleOffer = async () => {
    if (!onOffer) return;
    setOffering(true);
    try {
      await onOffer();
      setOffered(true);
      if (request.passengerPhone) setPassengerWhatsapp(request.passengerPhone);
      toast.success("¡Oferta enviada! El pasajero recibirá una notificación.");
    } catch {
      toast.error("No se pudo enviar la oferta. Intentá de nuevo.");
    } finally {
      setOffering(false);
    }
  };

  const seatsLabel = `${request.seats} lugar${request.seats !== 1 ? "es" : ""}`;
  const whatsappHref = passengerWhatsapp
    ? `https://wa.me/549${passengerWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${request.passengerName || ""}, te escribo desde Monte Carpooling. Vi que buscás viaje de ${request.origin} a ${request.destination} el ${new Date(request.date + "T12:00:00").toLocaleDateString("es-AR")}. ¡Puedo llevarte!`)}`
    : null;

  return (
    <div className="bg-card rounded-3xl p-5 border border-border shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {request.passengerAvatarUrl ? (
            <img src={request.passengerAvatarUrl} alt={request.passengerName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
          )}
          <div>
            <p className="font-bold text-sm text-foreground">{request.passengerName || "Pasajero"}</p>
            <p className="text-xs text-muted-foreground">
              {seatsLabel}{request.time ? ` · ${request.time}hs` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
            {new Date(request.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </span>
          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {seatsLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          <span className="font-medium text-foreground">{request.origin}</span>
        </div>
        <div className="ml-1 border-l-2 border-dashed border-muted-foreground/30 h-3" />
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-3 h-3 text-secondary flex-shrink-0" />
          <span className="font-medium text-foreground">{request.destination}</span>
        </div>
      </div>

      {request.notes && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3 italic">
          "{request.notes}"
        </p>
      )}

      {/* Sección de ofertas recibidas (solo para el dueño de la solicitud) */}
      {isOwn && (
        <div className="mb-3">
          {hasOffers ? (
            <>
              <button
                type="button"
                onClick={() => setShowOffers(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-sm font-bold text-primary"
              >
                <span>🚗 {pendingOffers.length} conductor{pendingOffers.length > 1 ? "es" : ""} quiere{pendingOffers.length > 1 ? "n" : ""} llevarte</span>
                {showOffers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showOffers && (
                <div className="mt-2 space-y-2">
                  {pendingOffers.map((offer: any) => {
                    const waNr = offer.driverPhone ? `549${offer.driverPhone.replace(/\D/g, "")}` : null;
                    return (
                      <div key={offer.id} className="bg-muted/40 rounded-2xl p-3 border border-border">
                        <div className="flex items-center gap-2 mb-2.5">
                          <button
                            onClick={() => setViewProfileId(offer.driverProfileId)}
                            className="flex items-center gap-2 flex-1 active:opacity-70 transition-opacity text-left"
                          >
                            {offer.driverAvatarUrl ? (
                              <img src={offer.driverAvatarUrl} alt={offer.driverName} className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center">
                                <Car className="w-4 h-4 text-secondary" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-sm text-foreground">{offer.driverName}</p>
                              <p className="text-xs text-primary font-medium">Ver perfil →</p>
                            </div>
                          </button>
                          {waNr && (
                            <a href={`https://wa.me/${waNr}?text=${encodeURIComponent(`Hola ${offer.driverName}, vi tu oferta en Monte Carpooling para el viaje ${request.origin} → ${request.destination}.`)}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs px-2 border-[#25D366] text-[#25D366]">
                                <Phone className="w-3 h-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                            onClick={() => acceptOffer.mutate(offer.id)}
                            disabled={acceptOffer.isPending || rejectOffer.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {acceptOffer.isPending ? "..." : "Aceptar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs"
                            onClick={() => rejectOffer.mutate(offer.id)}
                            disabled={acceptOffer.isPending || rejectOffer.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {rejectOffer.isPending ? "..." : "Rechazar"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-1">
              Aún no hay conductores disponibles para esta solicitud.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {isOwn && onDelete && (
          <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive border-destructive/30 flex-1">
            <Trash2 className="w-3 h-3 mr-1" /> Eliminar solicitud
          </Button>
        )}

        {!isOwn && !offered && (
          <Button
            size="sm"
            className="flex-1 text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
            onClick={handleOffer}
            disabled={offering}
          >
            {offering ? "Enviando..." : "🚗 Ofrezco llevarte"}
          </Button>
        )}

        {!isOwn && offered && (
          <div className="flex gap-2 flex-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl flex-1">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-xs font-bold text-green-700">¡Oferta enviada!</span>
            </div>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="text-xs font-bold px-3" style={{ background: "#25D366", color: "white" }}>
                  <Phone className="w-3 h-3 mr-1" /> WhatsApp
                </Button>
              </a>
            )}
          </div>
        )}

        {!isOwn && !offered && request.passengerPhone && (
          <a
            href={`https://wa.me/549${request.passengerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${request.passengerName || ""}, te escribo desde Monte Carpooling. ¡Puedo llevarte!`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="text-xs font-bold border-[#25D366] text-[#25D366]">
              <Phone className="w-3 h-3" />
            </Button>
          </a>
        )}
      </div>

      <ProfileSheet profileId={viewProfileId} onClose={() => setViewProfileId(null)} />
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"viajes" | "solicitudes">("viajes");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [searched, setSearched] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recentData, isLoading: loadingRecent } = useSearchTrips(
    { status: "scheduled" },
    { query: { enabled: !searched && activeTab === "viajes" } }
  );

  const { data: searchData, isLoading: loadingSearch } = useSearchTrips(
    { origin: origin || undefined, destination: destination || undefined, date: date || undefined, status: "scheduled" },
    { query: { enabled: searched && activeTab === "viajes" } }
  );

  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ["trip-requests"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("api/trip-requests"), { credentials: "include" });
      return res.json();
    },
    enabled: activeTab === "solicitudes",
  });

  const { data: myRequestsData } = useQuery({
    queryKey: ["trip-requests-my"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("api/trip-requests/my"), { credentials: "include" });
      return res.json();
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`api/trip-requests/${id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Solicitud eliminada");
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests-my"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const offerTrip = async (requestId: number) => {
    const res = await fetch(getApiUrl(`api/trip-requests/${requestId}/offer`), {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Error al enviar oferta");
    return res.json();
  };

  const myRequestIds = new Set((myRequestsData?.tripRequests || []).map((r: any) => r.id));
  const myRequestsById = new Map((myRequestsData?.tripRequests || []).map((r: any) => [r.id, r]));
  const data = searched ? searchData : recentData;
  const isLoadingTrips = searched ? loadingSearch : loadingRecent;

  return (
    <Layout>
      <div className="p-5 flex-1 flex flex-col">
        {/* Header MONTE */}
        <header className="mb-5 mt-4">
          <div className="flex items-baseline gap-0 mb-1">
            {MONTE_LETTERS.map((letter, i) => (
              <span key={i} style={{ color: MONTE_COLORS[i], fontFamily: "Outfit, sans-serif", fontWeight: 900 }} className="text-4xl tracking-tight leading-none">
                {letter}
              </span>
            ))}
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }} className="text-2xl text-foreground ml-2 tracking-tight">
              Carpooling
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">🗺️ San Miguel del Monte · Pcia. de Buenos Aires</p>
        </header>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/create-trip">
            <div className="rounded-3xl p-4 flex flex-col gap-2 cursor-pointer active:scale-[0.97] transition-transform border border-primary/20 h-full"
              style={{ backgroundColor: "rgba(26,142,163,0.07)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow" style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}>
                <Car className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-primary text-sm">¿Sos conductor?</p>
              <p className="text-xs text-muted-foreground leading-tight">Publicá tu viaje</p>
            </div>
          </Link>

          <Link href="/solicitar-viaje">
            <div className="rounded-3xl p-4 flex flex-col gap-2 cursor-pointer active:scale-[0.97] transition-transform border border-amber-500/20 h-full"
              style={{ backgroundColor: "rgba(196,34,32,0.06)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow" style={{ background: "linear-gradient(135deg, #C22020, #D4A520)" }}>
                <HandHeart className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-sm" style={{ color: "#C22020" }}>¿Buscás viaje?</p>
              <p className="text-xs text-muted-foreground leading-tight">Publicá tu solicitud</p>
            </div>
          </Link>
        </div>

        {/* Pestañas */}
        <div className="flex bg-muted/50 rounded-2xl p-1 mb-5">
          <button
            onClick={() => setActiveTab("viajes")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "viajes" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}
          >
            🚗 Viajes disponibles
          </button>
          <button
            onClick={() => setActiveTab("solicitudes")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "solicitudes" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}
          >
            🙋 Pasajeros buscando
          </button>
        </div>

        {/* Contenido según pestaña activa */}
        {activeTab === "viajes" ? (
          <>
            {/* Buscador */}
            <div className="bg-card rounded-3xl p-5 shadow-xl shadow-black/5 border border-border mb-6">
              <h2 className="font-bold text-base text-foreground mb-4">Buscar un viaje</h2>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                  </div>
                  <select value={origin} onChange={(e) => { setOrigin(e.target.value); setSearched(false); }}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-muted/50 border-2 border-transparent focus:border-primary focus:bg-background outline-none transition-all appearance-none font-medium text-foreground">
                    <option value="">Origen: ej. San Miguel del Monte</option>
                    {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <select value={destination} onChange={(e) => { setDestination(e.target.value); setSearched(false); }}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-muted/50 border-2 border-transparent focus:border-secondary focus:bg-background outline-none transition-all appearance-none font-medium text-foreground">
                    <option value="">Destino: ej. CABA</option>
                    {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSearched(false); }}
                    className="pl-12 bg-muted/50 border-transparent focus:border-primary font-medium" />
                </div>

                <Button size="lg" className="w-full text-base font-bold shadow-lg"
                  style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
                  onClick={() => setSearched(true)} disabled={isLoadingTrips}>
                  <Search className="w-5 h-5 mr-2" />
                  {isLoadingTrips ? "Buscando..." : "Buscar viaje"}
                </Button>
              </div>
            </div>

            {/* Lista de viajes */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {searched ? "Resultados" : "Viajes disponibles"}
              </h2>
              {!isLoadingTrips && data?.trips?.length ? (
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {data.trips.length} {searched ? "encontrado" : "viaje"}{data.trips.length !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            <SponsorSlot slot="home_banner" className="mb-4" />
            <div className="space-y-5">
              {isLoadingTrips ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-64 bg-card rounded-3xl animate-pulse border border-border" />
                ))
              ) : data?.trips?.length ? (
                data.trips.map((trip: any) => <TripCard key={trip.id} trip={trip} />)
              ) : (
                <div className="text-center py-16 bg-card rounded-3xl border border-border border-dashed">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {searched ? "Sin resultados" : "Aún no hay viajes"}
                  </h3>
                  <p className="text-muted-foreground max-w-[220px] mx-auto text-sm">
                    {searched ? "Probá cambiando el origen, destino o la fecha." : "¡Sé el primero en publicar un viaje!"}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Lista de solicitudes */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Pasajeros buscando</h2>
              {!loadingRequests && requestsData?.tripRequests?.length ? (
                <span className="text-sm font-semibold text-amber-600 bg-amber-100 px-3 py-1 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
                  {requestsData.tripRequests.length} solicitud{requestsData.tripRequests.length !== 1 ? "es" : ""}
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              {loadingRequests ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 bg-card rounded-3xl animate-pulse border border-border" />
                ))
              ) : requestsData?.tripRequests?.length ? (
                requestsData.tripRequests.map((req: any) => {
                  const own = myRequestIds.has(req.id);
                  const enriched = own ? (myRequestsById.get(req.id) ?? req) : req;
                  return (
                    <TripRequestCard
                      key={req.id}
                      request={enriched}
                      isOwn={own}
                      onDelete={own ? () => deleteRequest.mutate(req.id) : undefined}
                      onOffer={!own ? () => offerTrip(req.id) : undefined}
                      onRefresh={() => {
                        queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
                        queryClient.invalidateQueries({ queryKey: ["trip-requests-my"] });
                      }}
                    />
                  );
                })
              ) : (
                <div className="text-center py-16 bg-card rounded-3xl border border-border border-dashed">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <HandHeart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Sin solicitudes aún</h3>
                  <p className="text-muted-foreground max-w-[220px] mx-auto text-sm">
                    Todavía nadie publicó que busca viaje. ¡Podés ser el primero!
                  </p>
                  <Link href="/solicitar-viaje">
                    <Button className="mt-4" style={{ background: "linear-gradient(135deg, #C22020, #D4A520)" }}>
                      <HandHeart className="w-4 h-4 mr-2" /> Publicar solicitud
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
