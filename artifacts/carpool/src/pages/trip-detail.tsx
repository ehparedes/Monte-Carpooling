import SponsorSlot from "@/components/sponsor-slot";
import { Layout } from "@/components/layout";
import { TripCard } from "@/components/trip-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ProfileSheet } from "@/components/profile-sheet";
import { useRoute, Link } from "wouter";
import { useGetTripById, useCreateBooking, useGetMyProfile, useCreateRating } from "@workspace/api-client-react";
import { ArrowLeft, MessageCircle, ShieldCheck, MapPin, Star, Clock, CheckCircle2, XCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

const REJECTION_REASONS = [
  "No tengo más lugar disponible",
  "Los horarios no me coinciden",
  "Cambié los planes del viaje",
  "No conozco al pasajero",
  "Prefiero no dar un motivo",
  "Otro motivo...",
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-3xl transition-transform active:scale-90 ${star <= value ? "text-amber-400" : "text-muted"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function TripDetail() {
  const [, params] = useRoute("/trip/:id");
  const tripId = Number(params?.id);
  const { data: tripDetail, isLoading, refetch } = useGetTripById(tripId);
  const { data: profile } = useGetMyProfile();
  const { mutate: bookSeat, isPending } = useCreateBooking();
  const { mutate: submitRating, isPending: isRating } = useCreateRating();
  const { toast } = useToast();
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingDone, setRatingDone] = useState(false);
  const [ratedIds, setRatedIds] = useState<number[]>([]);
  const [ratingTarget, setRatingTarget] = useState<number | null>(null);
  const [rejectModalBookingId, setRejectModalBookingId] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [viewProfileId, setViewProfileId] = useState<number | null>(null);

  const { mutate: confirmBooking, isPending: isConfirming } = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(getApiUrl(`api/bookings/${bookingId}/confirm`), { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Reserva confirmada", description: "El pasajero recibirá una notificación." });
      refetch();
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const { mutate: rejectBooking, isPending: isRejecting } = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number; reason: string }) => {
      const res = await fetch(getApiUrl(`api/bookings/${bookingId}/reject`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reserva rechazada", description: "El lugar quedó libre nuevamente." });
      setRejectModalBookingId(null);
      setSelectedReason(REJECTION_REASONS[0]);
      setCustomReason("");
      refetch();
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const handleRejectConfirm = () => {
    if (!rejectModalBookingId) return;
    const reason = selectedReason === "Otro motivo..." ? customReason.trim() || "Sin motivo especificado" : selectedReason;
    rejectBooking({ bookingId: rejectModalBookingId, reason });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 animate-pulse space-y-4">
          <div className="w-10 h-10 bg-muted rounded-full" />
          <div className="h-64 bg-muted rounded-3xl" />
          <div className="h-32 bg-muted rounded-3xl" />
        </div>
      </Layout>
    );
  }

  if (!tripDetail) {
    return (
      <Layout>
        <div className="p-6 text-center mt-20">
          <h2 className="text-2xl font-bold">Viaje no encontrado</h2>
          <Link href="/"><Button className="mt-4">Volver al inicio</Button></Link>
        </div>
      </Layout>
    );
  }

  const isDriver = profile?.id === tripDetail.driverId;
  const myBooking = tripDetail.bookings?.find(b => b.passengerId === profile?.id && (b.status === "confirmed" || b.status === "pending"));
  const hasBooked = !!myBooking;
  const isPendingBooking = myBooking?.status === "pending";
  const isCompleted = tripDetail.status === "completed";
  const totalPrice = tripDetail.pricePerSeat * seatsToBook;

  const whatsappMessage = encodeURIComponent(
    `Hola ${tripDetail.driverName || ""}, te escribo desde Monte Carpooling por el viaje de ${tripDetail.origin} a ${tripDetail.destination} del ${tripDetail.date} a las ${tripDetail.time}. ¿Podemos coordinar detalles?`
  );
  const driverPhone = (tripDetail as any).driverPhone?.replace(/\D/g, "");
  const whatsappUrl = driverPhone
    ? `https://wa.me/549${driverPhone}?text=${whatsappMessage}`
    : `https://wa.me/?text=${whatsappMessage}`;

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Tu navegador no soporta geolocalización" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        navigator.clipboard.writeText(mapsUrl).then(() => {
          toast({ title: "📍 Ubicación copiada", description: "Pegá el link en el chat para compartir tu posición." });
        }).catch(() => {
          window.open(mapsUrl, "_blank");
        });
      },
      () => {
        toast({ variant: "destructive", title: "No se pudo obtener la ubicación", description: "Permití el acceso a la ubicación en tu navegador." });
      }
    );
  };

  const handleBook = () => {
    bookSeat(
      { data: { tripId: tripDetail.id, seatsBooked: seatsToBook } },
      {
        onSuccess: () => {
          toast({ title: "¡Reserva confirmada!", description: "Reservaste tu lugar en este viaje." });
          refetch();
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error al reservar", description: err.message || "Ocurrió un error." });
        }
      }
    );
  };

  const handleRating = () => {
    if (ratingStars === 0) {
      toast({ variant: "destructive", title: "Seleccioná al menos 1 estrella" });
      return;
    }
    const pendingPassengers = (tripDetail.bookings ?? []).filter(b => b.status === "confirmed" && !ratedIds.includes(b.passengerId));
    const ratedUserId = isDriver
      ? (ratingTarget ?? pendingPassengers[0]?.passengerId)
      : tripDetail.driverId;

    if (!ratedUserId) return;

    submitRating(
      { data: { tripId: tripDetail.id, ratedUserId, stars: ratingStars, comment: ratingComment } as any },
      {
        onSuccess: () => {
          toast({ title: "¡Gracias por tu calificación!" });
          if (isDriver) {
            const next = [...ratedIds, ratedUserId as number];
            setRatedIds(next);
            setRatingStars(0);
            setRatingComment("");
            setRatingTarget(null);
            const left = (tripDetail.bookings ?? []).filter(b => b.status === "confirmed" && !next.includes(b.passengerId));
            if (left.length === 0) setRatingDone(true);
          } else {
            setRatingDone(true);
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err.message;
          toast({ variant: "destructive", title: "Error", description: msg });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="p-6 pb-36">
        <header className="flex items-center gap-4 mb-6 mt-2">
          <Link href="/">
            <button className="w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-sm border border-border hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Detalle del viaje</h1>
        </header>

        <TripCard trip={tripDetail} hideBookButton />

        {/* Botón ver perfil del conductor (solo para pasajeros) */}
        {!isDriver && (
          <button
            onClick={() => setViewProfileId(tripDetail.driverId)}
            className="w-full mt-4 flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:bg-muted/50 transition-colors active:scale-98 text-left"
          >
            <img
              src={tripDetail.driverAvatarUrl?.startsWith("/objects/") ? getApiUrl("api/storage") + tripDetail.driverAvatarUrl : (tripDetail.driverAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tripDetail.driverName}`)}
              alt={tripDetail.driverName}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
            />
            <div className="flex-1">
              <p className="font-bold text-foreground">{tripDetail.driverName || "Conductor"}</p>
              <p className="text-xs text-primary font-semibold">Tocar para ver perfil completo →</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          </button>
        )}

        {/* Banner de seguridad */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4 flex gap-3 items-start">
          <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-800">Conductor verificado</h4>
            <p className="text-sm text-blue-700/80 mt-1">La identidad y los datos del vehículo fueron validados por Carpooling Monte.</p>
          </div>
        </div>

        {/* Botones de seguridad (cuando ya reservó) */}
        {(hasBooked || isDriver) && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="btn-whatsapp py-3 px-4 rounded-2xl text-sm font-bold">
              <WhatsAppIcon /> WhatsApp
            </a>
            <button
              onClick={handleShareLocation}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-primary/10 text-primary font-bold text-sm border border-primary/20 active:scale-95 transition-all"
            >
              <MapPin className="w-4 h-4" /> Mi ubicación
            </button>
          </div>
        )}

        {/* Lista de pasajeros (solo para el conductor) */}
        {isDriver && tripDetail.bookings && tripDetail.bookings.filter(b => b.status !== 'cancelled').length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">
              Reservas ({tripDetail.bookings.filter(b => b.status === 'confirmed').reduce((a, b) => a + b.seatsBooked, 0)} confirmados)
            </h3>
            <div className="space-y-3">
              {tripDetail.bookings.filter(b => b.status !== 'cancelled').map(booking => (
                <div key={booking.id} className={`bg-card p-4 rounded-2xl border flex flex-col gap-3 ${booking.status === 'pending' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewProfileId(booking.passengerId)}
                        className="flex items-center gap-3 active:opacity-70 transition-opacity"
                      >
                        <img
                          src={booking.passengerAvatarUrl?.startsWith("/objects/") ? getApiUrl("api/storage") + booking.passengerAvatarUrl : (booking.passengerAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.passengerName}`)}
                          className="w-10 h-10 rounded-full bg-muted object-cover border-2 border-primary/10"
                          alt="Pasajero"
                        />
                        <div className="text-left">
                          <p className="font-bold">{booking.passengerName}</p>
                          <p className="text-xs text-primary font-medium">Ver perfil →</p>
                        </div>
                      </button>
                    </div>
                    {booking.status === 'confirmed' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Confirmado
                        </span>
                        <Link href={`/chat/${tripDetail.id}`}>
                          <Button size="icon" variant="secondary" className="rounded-full w-9 h-9">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pendiente
                      </span>
                    )}
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                        onClick={() => confirmBooking(booking.id)}
                        disabled={isConfirming || isRejecting}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {isConfirming ? "Confirmando..." : "Aceptar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 font-bold"
                        onClick={() => setRejectModalBookingId(booking.id)}
                        disabled={isConfirming || isRejecting}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de calificación (viaje completado) */}
        {isCompleted && (hasBooked || isDriver) && !ratingDone && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-3xl p-5">
            <h3 className="font-bold text-lg text-amber-900 mb-1 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Calificá este viaje
            </h3>
            <p className="text-sm text-amber-700 mb-4">Tu opinión ayuda a la comunidad.</p>
            {isDriver && (() => {
              const opts = (tripDetail.bookings ?? []).filter(b => b.status === "confirmed" && !ratedIds.includes(b.passengerId));
              if (opts.length > 1) {
                return (
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    value={ratingTarget ?? opts[0].passengerId}
                    onChange={e => setRatingTarget(Number(e.target.value))}
                  >
                    {opts.map(b => <option key={b.passengerId} value={b.passengerId}>{(b as any).passengerName || "Pasajero"}</option>)}
                  </select>
                );
              }
              if (opts.length === 1) {
                return <p className="text-sm text-muted-foreground">Calificando a {(opts[0] as any).passengerName || "tu pasajero"}</p>;
              }
              return null;
            })()}
            <StarRating value={ratingStars} onChange={setRatingStars} />
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder="Comentario opcional..."
              className="mt-4 w-full rounded-2xl border-2 border-amber-200 bg-white p-3 text-sm resize-none outline-none focus:border-amber-400 transition-colors"
              rows={2}
            />
            <Button
              className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleRating}
              disabled={isRating || ratingStars === 0}
            >
              {isRating ? "Enviando..." : "Enviar calificación"}
            </Button>
          </div>
        )}

        {isCompleted && ratingDone && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="font-bold text-green-700">✅ ¡Calificación enviada! Gracias.</p>
          </div>
        )}
      </div>

      {/* Panel de perfil */}
      <ProfileSheet profileId={viewProfileId} onClose={() => setViewProfileId(null)} />

      {/* Modal de motivo de rechazo */}
      <Dialog open={rejectModalBookingId !== null} onOpenChange={(open) => { if (!open) setRejectModalBookingId(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground">¿Por qué rechazás esta reserva?</DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-1">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-snug">
              <span className="font-bold">Tu respuesta es confidencial.</span> No se publicará ni se compartirá con el pasajero.
            </p>
          </div>

          <div className="space-y-2 my-1">
            {REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                  selectedReason === reason
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === "Otro motivo..." && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Escribí el motivo acá (confidencial)..."
              className="w-full rounded-2xl border-2 border-border bg-muted/50 p-3 text-sm resize-none outline-none focus:border-primary transition-colors"
              rows={3}
              maxLength={200}
            />
          )}

          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRejectModalBookingId(null)}
              disabled={isRejecting}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleRejectConfirm}
              disabled={isRejecting || (selectedReason === "Otro motivo..." && !customReason.trim())}
            >
              {isRejecting ? "Rechazando..." : "Rechazar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barra de acción fija abajo */}
      {(isDriver || myBooking) && tripDetail.status === "scheduled" && (
        <SponsorSlot slot="meeting_point" zone={tripDetail.origin} className="my-4" />
      )}
      {isCompleted && (isDriver || myBooking) && (
        <SponsorSlot slot="trip_coupon" className="my-4" />
      )}
      {!isDriver && tripDetail.status === "scheduled" && (
        <div className="fixed bottom-[80px] left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
          {hasBooked ? (
            <div className="flex gap-3">
              {isPendingBooking ? (
                <div className="flex-1 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col items-center justify-center py-3 px-4">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <Clock className="w-4 h-4" /> En espera de confirmación
                  </div>
                  <p className="text-xs text-amber-600 mt-0.5">El conductor revisará tu solicitud</p>
                </div>
              ) : (
                <>
                  <Link href={`/chat/${tripDetail.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <MessageCircle className="w-5 h-5 mr-2" /> Ir al chat
                    </Button>
                  </Link>
                  <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Confirmado
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selector de asientos */}
              {tripDetail.availableSeats > 1 && (
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2">
                  <span className="text-sm font-semibold text-muted-foreground">Lugares a reservar</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSeatsToBook(s => Math.max(1, s - 1))}
                      className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center font-bold text-lg active:scale-90 transition-transform"
                    >−</button>
                    <span className="font-bold text-lg w-6 text-center">{seatsToBook}</span>
                    <button
                      onClick={() => setSeatsToBook(s => Math.min(tripDetail.availableSeats, s + 1))}
                      className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center font-bold text-lg active:scale-90 transition-transform"
                    >+</button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {tripDetail.pricePerSeat === 0 ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      `$ ${totalPrice.toLocaleString("es-AR")}`
                    )}
                  </span>
                </div>
                <div className="flex-1">
                  <Button
                    className="w-full text-base font-bold"
                    size="lg"
                    style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
                    disabled={tripDetail.availableSeats === 0 || isPending}
                    onClick={handleBook}
                  >
                    {isPending ? "Reservando..." : tripDetail.availableSeats === 0 ? "Sin lugares" : `Reservar ${seatsToBook} lugar${seatsToBook > 1 ? "es" : ""}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
