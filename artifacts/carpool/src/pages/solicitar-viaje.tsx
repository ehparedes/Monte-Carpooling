import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TOWNS } from "@/lib/constants";
import { MapPin, Calendar, Clock, Users, ArrowLeft, HandHeart } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";

const schema = z.object({
  origin: z.string().min(1, "El origen es obligatorio"),
  destination: z.string().min(1, "El destino es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().optional(),
  seats: z.coerce.number().min(1).max(8),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SolicitarViaje() {
  const [, navigate] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { origin: "", destination: "", date: "", time: "", seats: 1, notes: "" },
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch(getApiUrl("api/trip-requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("¡Solicitud publicada! Los conductores la van a ver.");
      navigate("/");
    } catch {
      toast.error("No se pudo publicar la solicitud. Intentá de nuevo.");
    }
  }

  return (
    <Layout>
      <div className="p-5 flex-1 flex flex-col">
        <header className="mb-6 mt-4 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Busco viaje</h1>
            <p className="text-sm text-muted-foreground">Publicá tu necesidad y te contactan</p>
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-1">

            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Ruta
              </h2>

              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Desde</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-12 px-4 rounded-2xl bg-muted/50 border-2 border-transparent focus:border-primary outline-none appearance-none font-medium text-foreground">
                      <option value="">Ej: San Miguel del Monte</option>
                      {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="destination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasta</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-12 px-4 rounded-2xl bg-muted/50 border-2 border-transparent focus:border-secondary outline-none appearance-none font-medium text-foreground">
                      <option value="">Ej: Buenos Aires</option>
                      {TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Cuándo
              </h2>

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
                    <FormLabel>Hora aprox.</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Opcional</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="bg-card rounded-3xl p-5 border border-border space-y-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Detalles
              </h2>

              <FormField control={form.control} name="seats" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asientos que necesitás</FormLabel>
                  <div className="flex items-center gap-4 mt-1">
                    <button type="button" onClick={() => field.onChange(Math.max(1, (field.value || 1) - 1))}
                      className="w-10 h-10 rounded-2xl bg-muted font-bold text-xl flex items-center justify-center">−</button>
                    <span className="text-2xl font-bold w-8 text-center">{field.value}</span>
                    <button type="button" onClick={() => field.onChange(Math.min(8, (field.value || 1) + 1))}
                      className="w-10 h-10 rounded-2xl bg-primary text-white font-bold text-xl flex items-center justify-center">+</button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ej: Necesito salir antes de las 8, llevo equipaje pequeño..." className="resize-none" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-bold shadow-lg"
              style={{ background: "linear-gradient(135deg, #C22020, #D4A520)" }}
              disabled={form.formState.isSubmitting}
            >
              <HandHeart className="w-5 h-5 mr-2" />
              {form.formState.isSubmitting ? "Publicando..." : "Publicar solicitud"}
            </Button>

          </form>
        </Form>
      </div>
    </Layout>
  );
}
