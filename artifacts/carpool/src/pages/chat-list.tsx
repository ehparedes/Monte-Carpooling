import { Layout } from "@/components/layout";
import { useGetMyBookings, useGetMyDriverTrips } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageCircle, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

interface UnreadInfo {
  tripId: number;
  lastMessageAt: string;
  lastMessage: string;
  senderName: string;
}

function getChatLastSeen(tripId: number): string | null {
  return localStorage.getItem(`chatLastSeen_${tripId}`);
}

export default function ChatList() {
  const { data: bookingsData, isLoading: loadB } = useGetMyBookings();
  const { data: driverData, isLoading: loadD } = useGetMyDriverTrips();

  const { data: unreadsData } = useQuery({
    queryKey: ["chat-unreads"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("api/chat/unreads"), { credentials: "include" });
      if (!res.ok) return { unreads: [] as UnreadInfo[] };
      return res.json() as Promise<{ unreads: UnreadInfo[] }>;
    },
    refetchInterval: 15000,
  });

  const unreadMap = new Map<number, UnreadInfo>();
  for (const u of (unreadsData?.unreads ?? [])) {
    const lastSeen = getChatLastSeen(u.tripId);
    if (!lastSeen || new Date(u.lastMessageAt) > new Date(lastSeen)) {
      unreadMap.set(u.tripId, u);
    }
  }

  const activeTrips = [
    ...(bookingsData?.bookings?.filter(b => b.status === "confirmed" && b.trip?.status !== "completed").map(b => b.trip) || []),
    ...(driverData?.trips?.filter(t => t.status !== "completed" && t.status !== "cancelled") || [])
  ].filter(Boolean);

  const uniqueTrips = Array.from(new Map(activeTrips.map(item => [item!.id, item])).values());
  const isLoading = loadB || loadD;

  return (
    <Layout>
      <div className="p-6">
        <header className="mb-6 mt-4">
          <h1 className="text-3xl font-extrabold text-foreground">Mensajes</h1>
        </header>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
            ))
          ) : uniqueTrips.length > 0 ? (
            uniqueTrips.map(trip => {
              const unread = unreadMap.get(trip!.id);
              return (
                <Link key={trip!.id} href={`/chat/${trip!.id}`}>
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-colors shadow-sm ${unread ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700" : "bg-card hover:bg-muted/50 border-border"}`}>
                    <div className="relative shrink-0">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${unread ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"}`}>
                        <MessageCircle className={`w-6 h-6 ${unread ? "text-red-500" : "text-primary"}`} />
                      </div>
                      {unread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-base truncate ${unread ? "text-foreground" : ""}`}>
                          {trip!.origin} → {trip!.destination}
                        </h4>
                        {unread && (
                          <span className="shrink-0 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                            NUEVO
                          </span>
                        )}
                      </div>
                      {unread ? (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium truncate">
                          {unread.senderName}: {unread.lastMessage}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground truncate">
                          {format(parseISO(trip!.date), "dd/MM/yyyy", { locale: es })} a las {trip!.time}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-16 bg-card rounded-3xl border border-border border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Sin chats activos</h3>
              <p className="text-muted-foreground max-w-[200px] mx-auto">
                Reservá un viaje o publicá uno para chatear con otros viajeros.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
