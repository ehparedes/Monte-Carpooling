import { Layout } from "@/components/layout";
import { useAdminGetUsers, useAdminGetTrips, useAdminDeleteUser, useDeleteTrip, useGetMyProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2, Users, Map } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { TRIP_STATUS_LABELS } from "@/lib/constants";

export default function AdminPanel() {
  const { data: profile } = useGetMyProfile();
  const [tab, setTab] = useState<"users" | "trips">("users");
  const { toast } = useToast();

  const { data: usersData, refetch: refetchUsers } = useAdminGetUsers({ query: { enabled: !!profile?.isAdmin && tab === "users" } });
  const { data: tripsData, refetch: refetchTrips } = useAdminGetTrips({ query: { enabled: !!profile?.isAdmin && tab === "trips" } });

  const { mutate: deleteUser } = useAdminDeleteUser();
  const { mutate: deleteTrip } = useDeleteTrip();

  if (!profile?.isAdmin) {
    return <Layout><div className="p-6 mt-20 text-center text-destructive font-bold">Acceso no autorizado</div></Layout>;
  }

  const handleDeleteUser = (id: number) => {
    if (confirm("¿Eliminar este usuario permanentemente?")) {
      deleteUser({ userId: id }, { onSuccess: () => { toast({ title: "Usuario eliminado" }); refetchUsers(); } });
    }
  };

  const handleDeleteTrip = (id: number) => {
    if (confirm("¿Eliminar este viaje permanentemente?")) {
      deleteTrip({ tripId: id }, { onSuccess: () => { toast({ title: "Viaje eliminado" }); refetchTrips(); } });
    }
  };

  return (
    <Layout>
      <div className="p-6 pb-24">
        <header className="mb-6 mt-4">
          <h1 className="text-3xl font-extrabold text-foreground">Panel de administración</h1>
        </header>

        <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-6">
          <button onClick={() => setTab("users")} className={`flex-1 py-3 px-4 rounded-xl font-bold flex justify-center gap-2 ${tab === "users" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
            <Users className="w-5 h-5" /> Usuarios
          </button>
          <button onClick={() => setTab("trips")} className={`flex-1 py-3 px-4 rounded-xl font-bold flex justify-center gap-2 ${tab === "trips" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
            <Map className="w-5 h-5" /> Viajes
          </button>
        </div>

        <div className="space-y-4">
          {tab === "users" && usersData?.users.map(u => (
            <div key={u.id} className="bg-card p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">@{u.username}</p>
                <div className="flex gap-2 mt-2">
                  {u.isAdmin && <Badge variant="secondary">Admin</Badge>}
                  {u.isDriver && <Badge variant="outline">Conductor</Badge>}
                  <Badge variant="outline">ID: {u.id}</Badge>
                </div>
              </div>
              <Button variant="destructive" size="icon" className="rounded-full" onClick={() => handleDeleteUser(u.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {tab === "trips" && tripsData?.trips.map(t => (
            <div key={t.id} className="bg-card p-4 rounded-2xl border border-border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold">{t.origin} → {t.destination}</p>
                  <p className="text-sm text-muted-foreground">{format(parseISO(t.date), "dd/MM/yyyy", { locale: es })} - Conductor ID: {t.driverId}</p>
                </div>
                <Badge variant="outline">{TRIP_STATUS_LABELS[t.status] || t.status}</Badge>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => handleDeleteTrip(t.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar viaje
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
