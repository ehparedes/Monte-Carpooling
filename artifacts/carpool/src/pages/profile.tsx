import { Layout } from "@/components/layout";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogOut, Star, Car, Shield, FileText, Bell, Camera, ChevronRight, Package, User, Phone, IdCard, ImagePlus, Smile, Loader2 } from "lucide-react";
import { subscribeToPush } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/api";

const AVATAR_STYLES = [
  { id: "avataaars", label: "Clásico" },
  { id: "adventurer", label: "Aventurero" },
  { id: "bottts", label: "Robot" },
  { id: "lorelei", label: "Ilustrado" },
  { id: "fun-emoji", label: "Emoji" },
  { id: "pixel-art", label: "Pixel" },
];

function avatarUrl(style: string, seed: string) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading } = useGetMyProfile();
  const { mutate: updateProfile, isPending } = useUpdateMyProfile();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dni, setDni] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [totalSeats, setTotalSeats] = useState("4");
  const [acceptsPackages, setAcceptsPackages] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState("avataaars");
  const [photoTab, setPhotoTab] = useState<"foto" | "avatar">("avatar");
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const seed = user?.username || "usuario";

  const customPhotoUrl = (() => {
    const url = (profile as any)?.avatarUrl;
    if (url && url.startsWith("/objects/")) {
      return getApiUrl("api/storage") + url;
    }
    return null;
  })();

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Solo se permiten imágenes" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "La imagen no puede superar 5MB" });
      return;
    }
    setIsUploading(true);
    try {
      const urlRes = await fetch(getApiUrl("api/storage/uploads/request-url"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("No se pudo obtener URL de subida");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Error al subir la imagen");

      await fetch(getApiUrl("api/users/profile"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: objectPath }),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      toast({ title: "✅ Foto de perfil actualizada" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al subir foto", description: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setPhone((profile as any).phone || "");
      setDni((profile as any).dni || "");
      setIsDriver(profile.isDriver);
      setVehicleModel(profile.vehicleModel || "");
      setVehicleColor(profile.vehicleColor || "");
      setLicensePlate(profile.licensePlate || "");
      setTotalSeats(String(profile.totalSeats || 4));
      setAcceptsPackages(profile.acceptsPackages);
      setAvatarStyle((profile as any).avatarStyle || "avataaars");
      const existingUrl = (profile as any).avatarUrl;
      if (existingUrl && existingUrl.startsWith("/objects/")) {
        setPhotoTab("foto");
      }
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile(
      {
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          dni: dni.trim(),
          isDriver,
          vehicleModel: vehicleModel.trim(),
          vehicleColor: vehicleColor.trim(),
          licensePlate: licensePlate.trim(),
          totalSeats: Number(totalSeats) || 4,
          acceptsPackages,
          avatarStyle,
          ...(showPicker && photoTab === "avatar" && customPhotoUrl ? { avatarUrl: null } : {}),
        } as any,
      },
      {
        onSuccess: () => toast({ title: "✅ Perfil actualizado correctamente" }),
        onError: () => toast({ variant: "destructive", title: "Error al guardar", description: "Intentá de nuevo" }),
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-32 bg-muted rounded-3xl" />
          <div className="h-48 bg-muted rounded-3xl" />
          <div className="h-64 bg-muted rounded-3xl" />
        </div>
      </Layout>
    );
  }

  const currentAvatar = avatarUrl(avatarStyle, seed);

  return (
    <Layout>
      <div className="p-5 space-y-4 pb-10">

        {/* Header */}
        <header className="flex justify-between items-center mt-4 mb-2">
          <div>
            <h1 className="text-2xl font-extrabold">Mi perfil</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gestioná tu cuenta</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-2xl px-3 py-2 text-sm font-semibold active:scale-95 transition-transform"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </header>

        {/* Tarjeta de usuario con foto/avatar editable */}
        <div className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-4">
            {/* Foto actual */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border shadow-md bg-muted">
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted/80">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                ) : (
                  <img
                    src={customPhotoUrl || currentAvatar}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-background active:scale-90 transition-transform"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Nombre y rating */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.username}
              </p>
              <p className="text-muted-foreground text-sm">@{user?.username}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 px-2.5 py-1 rounded-full text-xs font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  {profile?.avgRating ? profile.avgRating.toFixed(1) : "Nuevo"}
                </div>
                <span className="text-xs text-muted-foreground">
                  ({profile?.totalRatings || 0} calificaciones)
                </span>
              </div>
            </div>
          </div>

          {/* Panel edición de foto */}
          {showPicker && (
            <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Tabs */}
              <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
                <button
                  onClick={() => setPhotoTab("foto")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    photoTab === "foto"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Mi foto
                </button>
                <button
                  onClick={() => setPhotoTab("avatar")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    photoTab === "avatar"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  Avatar
                </button>
              </div>

              {photoTab === "foto" && (
                <div className="space-y-3">
                  {customPhotoUrl && (
                    <div className="flex justify-center">
                      <img
                        src={customPhotoUrl}
                        alt="Tu foto"
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/20"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-sm active:scale-[0.98] transition-all hover:bg-primary/5 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Subiendo foto...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" />
                        {customPhotoUrl ? "Cambiar foto" : "Subir foto desde el teléfono"}
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">JPG, PNG o HEIC · Máximo 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {photoTab === "avatar" && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Elegí tu estilo de avatar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AVATAR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setAvatarStyle(style.id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                          avatarStyle === style.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/30 hover:border-primary/40"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-background">
                          <img src={avatarUrl(style.id, seed)} alt={style.label} className="w-full h-full" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">{style.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">Guardá los cambios para aplicar el avatar</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <Link href="/invitar">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 cursor-pointer">
            <span className="font-bold text-sm">Invitar vecinos</span>
            <span className="text-xs text-muted-foreground">Compartí tu link</span>
          </div>
        </Link>
        {profile?.isAdmin && (
          <Link href="/admin">
            <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary text-sm">Panel de administración</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary/60" />
            </div>
          </Link>
        )}

        {/* Datos personales */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Datos personales</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej: María"
                  className="rounded-xl bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apellido</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej: García"
                  className="rounded-xl bg-muted/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono / WhatsApp
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 2291 123456"
                className="rounded-xl bg-muted/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <IdCard className="w-3 h-3" /> DNI
              </Label>
              <Input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej: 38.123.456"
                className="rounded-xl bg-muted/40"
              />
            </div>
          </div>
        </div>

        {/* Sección conductor */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Perfil de conductor</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Toggle conductor */}
            <div className="flex items-center justify-between bg-muted/30 rounded-2xl p-4">
              <div>
                <p className="font-bold text-sm">Soy conductor</p>
                <p className="text-xs text-muted-foreground mt-0.5">Activá para publicar viajes</p>
              </div>
              <Switch checked={isDriver} onCheckedChange={setIsDriver} />
            </div>

            {isDriver && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Auto / Modelo</Label>
                    <Input
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ej: Ford Fiesta"
                      className="rounded-xl bg-muted/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Color</Label>
                    <Input
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="Ej: Blanco"
                      className="rounded-xl bg-muted/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patente</Label>
                    <Input
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="AB 123 CD"
                      className="rounded-xl bg-muted/40 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asientos disponibles</Label>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(e.target.value)}
                      className="rounded-xl bg-muted/40"
                    />
                  </div>
                </div>

                {/* Acepta encomiendas */}
                <div className="flex items-center justify-between border-2 border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-bold text-sm">Acepto encomiendas</p>
                      <p className="text-xs text-muted-foreground">Llevá paquetes en tus viajes</p>
                    </div>
                  </div>
                  <Switch checked={acceptsPackages} onCheckedChange={setAcceptsPackages} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="space-y-2">
          <button
            onClick={async () => {
              const ok = await subscribeToPush();
              toast({ title: ok ? "🔔 Notificaciones activadas" : "No se pudieron activar", variant: ok ? "default" : "destructive" });
            }}
            className="w-full bg-card border-2 border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Activar notificaciones</p>
                <p className="text-xs text-muted-foreground">Alertas de reservas y mensajes</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <Link href="/terms">
            <div className="w-full bg-card border-2 border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform hover:border-primary/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Términos y Privacidad</p>
                  <p className="text-xs text-muted-foreground">Condiciones de uso</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        </div>

        {/* Botón guardar */}
        <Button
          onClick={handleSave}
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl shadow-xl"
          style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          disabled={isPending}
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>

      </div>
    </Layout>
  );
}
