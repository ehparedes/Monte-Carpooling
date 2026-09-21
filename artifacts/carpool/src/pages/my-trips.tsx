import { Layout } from "@/components/layout";
import { TripCard } from "@/components/trip-card";
import { useGetMyBookings, useGetMyDriverTrips, useGetMyProfile, useUpdateTripStatus, useCancelBooking } from "@workspace/api-client-react";
import { useState } from "react";
import { Car, Ticket, Plus, Check, X, Clock, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { useConfirmBooking, useRejectBooking } from "@/hooks/useBookingActions";

interface PendingBooking {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerAvatarUrl: string | null;
  seatsBooked: number;
  createdAt: string;
}

interface ConfirmedPassenger {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerAvatarUrl: string | null;
  seatsBooked: number;
}

interface DriverTripWithPending {
  id: number;
  status: string;
  origin: string;
  destination: string;
  pendingBookings: PendingBooking[];
  confirmedPassengers: ConfirmedPassenger[];
  [key: string]: unknown;
}

function PendingBookingCard({ booking, onAction }: {
  booking: PendingBooking;
  onAction: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const { mutate: confirm, isPending: isConfirming } = useConfirmBooking(onAction);
  const { mutate: reject, isPending: isRejecting } = useRejectBooking(onAction);

  const avatarSrc = booking.passengerAvatarUrl?.startsWith("/objects/")
    ? getApiUrl("api/storage") + booking.passengerAvatarUrl
    : booking.passengerAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.passengerName)}`;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-300 dark:border-amber-700 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <img src={avatarSrc} alt={booking.passengerName} className="w-10 h-10 rounded-full object-cover border-2 border-amber-200" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{booking.passengerName}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Solicita {booking.seatsBooked} lugar{booking.seatsBooked > 1 ? "es" : ""}
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold shrink-0">Pendiente</Badge>
      </div>

      {showReject ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Motivo del rechazo (opcional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="flex-1" disabled={isRejecting}
              onClick={() => reject({ bookingId: booking.id, reason: rejectReason })}>
              {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={isConfirming}
            onClick={() => confirm(booking.id)}>
            <Check className="w-4 h-4 mr-1" /> {isConfirming ? "Aceptando..." : "Aceptar"}
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => setShowReject(true)}>
            <X className="w-4 h-4 mr-1" /> Rechazar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyTrips() {
  const [tab, setTab] = useState<"passenger" | "driver">("passenger");
  const { data: profile } = useGetMyProfile();
  const queryClient = useQueryClient();

  const { data: bookingsData, isLoading: loadBookings, refetch: refetchBookings } = useGetMyBookings({
    query: { enabled: tab === "passenger" }
  });

  const { data: driverData, isLoading: loadDriver, refetch: refetchDriver } = useGetMyDriverTrips({
    query: { enabled: tab === "driver" && !!profile?.isDriver }
  });

  const { mutate: updateStatus } = useUpdateTripStatus();
  const { mutate: cancelBooking } = useCancelBooking();

  const driverTrips = (driverData?.trips ?? []) as DriverTripWithPending[];
  const totalPending = driverTrips.reduce((acc, t) => acc + (t.pendingBookings?.length ?? 0), 0);

  const handleBookingAction = () => {
    refetchDriver();
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
  };

  return (
    <Layout>
      <div className="p-6">
        <header className="mb-6 mt-4">
          <h1 className="text-3xl font-extrabold text-foreground">Mis viajes</h1>
        </header>

        <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-8">
          <button
            onClick={() => setTab("passenger")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${tab === "passenger" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Ticket className="w-4 h-4" /> Pasajero
          </button>
          {profile?.isDriver && (
            <button
              onClick={() => setTab("driver")}
              className={`relative flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${tab === "driver" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Car className="w-4 h-4" /> Conductor
              {totalPending > 0 && (
                <span className="absolute top-1.5 right-3 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {totalPending}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="space-y-6">
          {tab === "passenger" && (
            <>
              {loadBookings ? (
                <div className="h-40 bg-card rounded-3xl animate-pulse" />
              ) : bookingsData?.bookings?.length ? (
                bookingsData.bookings.map(booking => (
                  <div key={booking.id} className="relative">
                    {booking.trip && <TripCard trip={booking.trip} hideBookButton />}
                    <div className="mt-3 space-y-2 px-2 pb-1">
                      <div className="flex justify-between items-center">
                        <Badge variant={booking.status === "confirmed" ? "success" : booking.status === "pending" ? "outline" : "destructive"}>
                          {booking.status === "confirmed" ? "Confirmado" : booking.status === "pending" ? "Pendiente de aprobación" : "Cancelado"}
                        </Badge>
                        {booking.status === "confirmed" && booking.trip?.status === "scheduled" && (
                          <button
                            className="text-sm font-semibold text-destructive hover:underline"
                            onClick={() => {
                              if (confirm("¿Seguro que querés cancelar esta reserva?")) {
                                cancelBooking({ bookingId: booking.id }, { onSuccess: () => refetchBookings() });
                              }
                            }}
                          >
                            Cancelar reserva
                          </button>
                        )}
                      </div>
                      {booking.status === "confirmed" && (
                        <Link href={`/chat/${booking.trip?.id}`}>
                          <Button size="sm" className="w-full gap-2 bg-primary text-white rounded-xl">
                            <MessageCircle className="w-4 h-4" />
                            Chatear con el conductor
                          </Button>
                        </Link>
                      )}
                      {booking.status === "pending" && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          El chat se habilitará cuando el conductor acepte tu solicitud
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">Todavía no tenés reservas activas.</p>
                  <Link href="/"><Button>Buscar un viaje</Button></Link>
                </div>
              )}
            </>
          )}

          {tab === "driver" && profile?.isDriver && (
            <>
              <div className="mb-4">
                <Link href="/create-trip">
                  <Button className="w-full border-dashed border-2 text-base py-6" variant="outline">
                    <Plus className="mr-2" /> Publicar nuevo viaje
                  </Button>
                </Link>
              </div>
              {loadDriver ? (
                <div className="h-40 bg-card rounded-3xl animate-pulse" />
              ) : driverTrips.length ? (
                driverTrips.map(trip => (
                  <div key={trip.id} className="mb-8 bg-card rounded-3xl border border-border shadow-md overflow-hidden">
                    <TripCard trip={trip as Parameters<typeof TripCard>[0]["trip"]} hideBookButton />

                    {trip.confirmedPassengers?.length > 0 && (
                      <div className="px-4 pt-4 pb-3 space-y-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {trip.confirmedPassengers.length} pasajero{trip.confirmedPassengers.length > 1 ? "s" : ""} confirmado{trip.confirmedPassengers.length > 1 ? "s" : ""}
                          </p>
                          <Link href={`/chat/${trip.id}`}>
                            <Button size="sm" className="gap-1.5 bg-primary text-white h-8 text-xs rounded-xl">
                              <MessageCircle className="w-3.5 h-3.5" />
                              Ir al chat del viaje
                            </Button>
                          </Link>
                        </div>
                        <div className="flex flex-col gap-2">
                          {trip.confirmedPassengers.map(p => {
                            const avatarSrc = p.passengerAvatarUrl?.startsWith("/objects/")
                              ? getApiUrl("api/storage") + p.passengerAvatarUrl
                              : p.passengerAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.passengerName)}`;
                            return (
                              <div key={p.id} className="flex items-center gap-3 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-700 rounded-xl px-3 py-2">
                                <img src={avatarSrc} alt={p.passengerName} className="w-9 h-9 rounded-full object-cover border-2 border-green-200" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate">{p.passengerName}</p>
                                  <p className="text-xs text-muted-foreground">{p.seatsBooked} lugar{p.seatsBooked > 1 ? "es" : ""} reservado{p.seatsBooked > 1 ? "s" : ""}</p>
                                </div>
                                <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px] shrink-0">Confirmado</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {trip.pendingBookings?.length > 0 && (
                      <div className="px-4 pt-3 pb-1 space-y-3">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {trip.pendingBookings.length} solicitud{trip.pendingBookings.length > 1 ? "es" : ""} pendiente{trip.pendingBookings.length > 1 ? "s" : ""}
                        </p>
                        {trip.pendingBookings.map(b => (
                          <PendingBookingCard key={b.id} booking={b} onAction={handleBookingAction} />
                        ))}
                      </div>
                    )}

                    {trip.status !== "cancelled" && trip.status !== "completed" && (
                      <div className="p-4 bg-muted/30 border-t border-border flex gap-2 mt-2">
                        {trip.status === "scheduled" && (
                          <>
                            <Button size="sm" variant="accent" className="flex-1"
                              onClick={() => updateStatus({ tripId: trip.id, data: { status: "in_progress" } }, { onSuccess: () => refetchDriver() })}>
                              Iniciar viaje
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1"
                              onClick={() => { if (confirm("¿Cancelar el viaje?")) updateStatus({ tripId: trip.id, data: { status: "cancelled" } }, { onSuccess: () => refetchDriver() }); }}>
                              Cancelar
                            </Button>
                          </>
                        )}
                        {trip.status === "in_progress" && (
                          <Button size="sm" variant="default" className="w-full"
                            onClick={() => updateStatus({ tripId: trip.id, data: { status: "completed" } }, { onSuccess: () => refetchDriver() })}>
                            Finalizar viaje
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">Todavía no publicaste ningún viaje.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
