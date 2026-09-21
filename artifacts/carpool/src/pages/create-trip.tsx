import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOWNS, MEETING_POINTS } from "@/lib/constants";
import { useCreateTrip, useGetMyProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

const CUSTOM_MEETING_VALUE = "__otro__";

type PriceType = "fixed" | "free" | "optional";

const formSchema = z.object({
  origin: z.string().min(1, "El origen es obligatorio"),
  destination: z.string().min(1, "El destino es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  availableSeats: z.coerce.number().min(1, "Debés ofrecer al menos 1 lugar"),
  priceType: z.enum(["fixed", "free", "optional"]),
  pricePerSeat: z.coerce.number().min(0),
  meetingPoint: z.string().min(1, "El punto de encuentro es obligatorio"),
  acceptsPackages: z.boolean().default(false),
}).refine(data => data.origin !== data.destination, {
  message: "El origen y el destino no pueden ser iguales",
  path: ["destination"],
}).refine(data => data.priceType !== "fixed" || data.pricePerSeat > 0, {
  message: "Ingresá un precio mayor a $0",
  path: ["pricePerSeat"],
});

const PRICE_OPTIONS: { value: PriceType; label: string; sublabel: string; color: string }[] = [
  { value: "fixed", label: "Precio Fijo", sublabel: "Establecés un monto en $ ARS", color: "border-blue-500 bg-blue-50 text-blue-700" },
  { value: "optional", label: "A voluntad", sublabel: "Para el combustible / lo que puedas", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "free", label: "Gratis / Gauchada", sublabel: "No cobrás nada", color: "border-green-500 bg-green-50 text-green-700" },
];

export default function CreateTrip() {
  const { data: profile } = useGetMyProfile();
  const { mutate: createTrip, isPending } = useCreateTrip();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: "", destination: "", date: "", time: "",
      availableSeats: 1, priceType: "fixed", pricePerSeat: 2000,
      meetingPoint: "", acceptsPackages: false,
    }
  });

  const priceType = form.watch("priceType");
  const [isCustomMeeting, setIsCustomMeeting] = useState(false);

  if (!profile?.isDriver) {
    return (
      <Layout>
        <div className="p-6 text-center mt-20">
          <h2 className="text-2xl font-bold mb-2">Perfil de conductor requerido</h2>
          <p className="text-muted-foreground mb-6">Tenés que registrarte como conductor antes de publicar viajes.</p>
          <Button onClick={() => setLocation("/profile")}>Ir al perfil</Button>
        </div>
      </Layout>
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const finalPrice = values.priceType === "fixed" ? values.pricePerSeat : 0;
    createTrip({ data: { ...values, pricePerSeat: finalPrice } as any }, {
      onSuccess: () => {
        toast({ title: "¡Viaje publicado exitosamente!" });
        setLocation("/my-trips");
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    });
  }

  return (
    <Layout>
      <div className="p-6">
        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold text-foreground">Publicar viaje</h1>
          <p className="text-muted-foreground mt-1">¿A dónde vas?</p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Ruta */}
            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Ruta</h3>
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen</FormLabel>
                  <FormControl>
                    <select {...field} className="flex h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus-visible:outline-none focus-visible:border-primary">
                      <option value="">Seleccioná el origen</option>
                      {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="destination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <select {...field} className="flex h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus-visible:outline-none focus-visible:border-secondary">
                      <option value="">Seleccioná el destino</option>
                      {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">DD/MM/AAAA</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">HH:MM</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="meetingPoint" render={({ field }) => (
                <FormItem>
                  <FormLabel>Punto de encuentro</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <select
                        value={isCustomMeeting ? CUSTOM_MEETING_VALUE : field.value}
                        onChange={(e) => {
                          if (e.target.value === CUSTOM_MEETING_VALUE) {
                            setIsCustomMeeting(true);
                            field.onChange("");
                          } else {
                            setIsCustomMeeting(false);
                            field.onChange(e.target.value);
                          }
                        }}
                        className="flex h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus-visible:outline-none focus-visible:border-primary"
                      >
                        <option value="">Seleccioná el punto de encuentro</option>
                        {MEETING_POINTS.map(t => <option key={t} value={t}>{t}</option>)}
                        <option value={CUSTOM_MEETING_VALUE}>📍 Otro punto de encuentro...</option>
                      </select>
                      {isCustomMeeting && (
                        <Input
                          {...field}
                          placeholder="Ej: Esquina Mitre y Sarmiento, frente al banco..."
                          className="rounded-2xl border-2 border-primary h-14 px-4"
                          autoFocus
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="availableSeats" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugares disponibles</FormLabel>
                  <FormControl><Input type="number" min="1" max={profile.totalSeats || 4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Precio */}
            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Precio del viaje</h3>

              <FormField control={form.control} name="priceType" render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-1 gap-3">
                    {PRICE_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${field.value === opt.value ? opt.color + " border-current" : "border-border bg-background"}`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          checked={field.value === opt.value}
                          onChange={() => field.onChange(opt.value)}
                          className="w-4 h-4 accent-primary"
                        />
                        <div>
                          <p className="font-bold text-sm">{opt.label}</p>
                          <p className="text-xs opacity-70">{opt.sublabel}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {priceType === "fixed" && (
                <FormField control={form.control} name="pricePerSeat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto en $ ARS por lugar</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                        <Input type="number" min="0" step="1" placeholder="ej. 3000" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {/* Extras */}
            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm">
              <FormField control={form.control} name="acceptsPackages" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Acepta encomiendas</FormLabel>
                    <p className="text-xs text-muted-foreground">Llevá paquetes pequeños de otras personas.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <Button type="submit" size="lg" className="w-full text-lg shadow-xl py-6" disabled={isPending}>
              {isPending ? "Publicando..." : "🚗 Publicar viaje"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
