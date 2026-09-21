import { useState } from "react";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

const MONTE_COLORS = ["#D4A520", "#7A3428", "#1A8EA3", "#C22020", "#3D7A28"];
const MONTE_LETTERS = ["M", "o", "n", "t", "e"];

export function OnboardingModal() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useGetMyProfile();
  const { mutate: updateProfile, isPending } = useUpdateMyProfile();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const needsOnboarding = !isLoading && profile && !profile.firstName && !submitted;
  if (!needsOnboarding) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    updateProfile(
      {
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        } as any,
      },
      {
        onSuccess: () => setSubmitted(true),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          >
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground text-sm mb-1">Bienvenido/a a</p>
          <span className="inline-flex items-baseline">
            {MONTE_LETTERS.map((letter, i) => (
              <span
                key={i}
                style={{ color: MONTE_COLORS[i], fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
                className="text-3xl"
              >
                {letter}
              </span>
            ))}
            <span
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}
              className="text-xl text-foreground ml-1.5"
            >
              Carpooling
            </span>
          </span>
          <p className="text-muted-foreground text-sm mt-3 text-center leading-relaxed">
            Para empezar, contanos cómo te llamás
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-sm font-semibold">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: María"
                className="rounded-xl bg-muted/50"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-sm font-semibold">
                Apellido
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: García"
                className="rounded-xl bg-muted/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-semibold">
              Teléfono / WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 2291 123456"
              className="rounded-xl bg-muted/50"
            />
            <p className="text-[11px] text-muted-foreground px-1">
              Para que los pasajeros te puedan contactar
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-2xl font-bold text-base mt-2"
            style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
            disabled={isPending || !firstName.trim()}
          >
            {isPending ? "Guardando..." : "¡Listo, empezar! →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
