import { CommunityGate, needsCommunityGate, type CommunityStatus } from "./community-gate";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Store, Home, MapPin, MessageCircle, User, Shield, Car } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingModal } from "./onboarding-modal";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

const MONTE_COLORS = ["#D4A520", "#7A3428", "#1A8EA3", "#C22020", "#3D7A28"];
const MONTE_LETTERS = ["M", "o", "n", "t", "e"];

function MonteTitle() {
  return (
    <span className="inline-flex items-baseline">
      {MONTE_LETTERS.map((letter, i) => (
        <span
          key={i}
          style={{ color: MONTE_COLORS[i], fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
          className="text-5xl tracking-tight"
        >
          {letter}
        </span>
      ))}
      <span
        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}
        className="text-3xl text-white/90 ml-2 tracking-tight"
      >
        Carpooling
      </span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();
  const [showLoginExplainer, setShowLoginExplainer] = useState(false);

  const { data: pendingCountData } = useQuery({
    queryKey: ["pending-count"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("api/bookings/driver/pending-count"), { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });
  const pendingCount = pendingCountData?.count ?? 0;

  const { data: community, isLoading: communityLoading, refetch: refetchCommunity } = useQuery({
    queryKey: ["community-status"],
    queryFn: async (): Promise<CommunityStatus> => {
      const res = await fetch("/api/community/status", { credentials: "include" });
      if (!res.ok) throw new Error("community-status");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const { data: navFlags } = useQuery({
    queryKey: ["nav-flags"],
    queryFn: async () => {
      const res = await fetch("/api/sponsors/nav", { credentials: "include" });
      if (!res.ok) return { isAdmin: false, hasGuide: false };
      return res.json() as Promise<{ isAdmin: boolean; hasGuide: boolean }>;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#1A8EA3", borderTopColor: "transparent" }}
          />
          <span className="text-muted-foreground font-medium text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen relative flex flex-col overflow-hidden bg-gray-900">

        {/* ── MITAD SUPERIOR: foto + logo ── */}
        <div className="relative flex flex-col items-center" style={{ height: "42vh", overflow: "hidden" }}>
          {/* Foto de fondo — se muestra solo la zona del cielo/lago */}
          <div className="absolute inset-0">
            <img
              src="/images/cartel-monte.png"
              alt="San Miguel del Monte"
              className="w-full object-cover"
              style={{
                height: "180%",
                objectPosition: "center top",
                objectFit: "cover",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/60" />
          </div>

          {/* Logo centrado verticalmente en la zona del cielo */}
          <div className="relative z-10 flex items-start justify-center w-full h-full" style={{ marginTop: "-36px" }}>
            <img
              src="/images/logo-mark.png"
              alt="Monte Carpooling"
              className="drop-shadow-2xl"
              style={{ width: "72vw", maxWidth: 320, height: "auto" }}
            />
          </div>
        </div>

        {/* ── MITAD INFERIOR: panel con título y botón ── */}
        <div
          className="relative z-10 flex-1 px-6 pt-8 pb-10 flex flex-col gap-5 justify-center"
          style={{
            background: "linear-gradient(to bottom, rgba(10,18,25,0.97), #0a1219)",
            borderRadius: "2rem 2rem 0 0",
            marginTop: "-2rem",
          }}
        >
          {/* Título */}
          <div className="flex justify-center">
            <MonteTitle />
          </div>

          {/* Tagline */}
          <p className="text-center text-white/70 text-base font-medium leading-relaxed">
            Viajá en grupo, ahorrá dinero
            <br />
            y conectate con tu comunidad
          </p>

          {/* Stats decorativas */}
          <div className="flex justify-center gap-8">
            {[
              { value: "Monte", label: "Punto de partida" },
              { value: "100%", label: "Gratuito" },
              { value: "Seguro", label: "Entre vecinos" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-white font-bold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>{stat.value}</p>
                <p className="text-white/50 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Botón de login */}
          <button
            onClick={() => setShowLoginExplainer(true)}
            className="w-full py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 active:scale-95 text-white"
            style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
          >
            Ingresar a Monte Carpooling
          </button>

          {/* Características */}
          <div className="flex justify-center gap-6">
            {[
              { icon: "🚗", text: "Compartí el viaje" },
              { icon: "💰", text: "Ahorrá gastos" },
              { icon: "🤝", text: "Comunidad local" },
            ].map((f) => (
              <div key={f.text} className="flex flex-col items-center gap-1">
                <span className="text-xl">{f.icon}</span>
                <span className="text-white/50 text-[10px] text-center font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          {/* privacidad-visible: links públicos para verificación de Google */}
          <div className="flex justify-center gap-4 text-white/40 text-xs">
            <a href="/privacidad.html" className="underline hover:text-white/60">Política de privacidad</a>
            <span>·</span>
            <a href="/terminos.html" className="underline hover:text-white/60">Términos de uso</a>
            <span>·</span>
            <a href="mailto:monte.carpooling@elherlab.com" className="underline hover:text-white/60">Contacto</a>
          </div>

          {/* Explainer antes del login */}
          {showLoginExplainer && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => setShowLoginExplainer(false)}
            >
              <div
                className="w-full max-w-md rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-in slide-in-from-bottom-4 duration-300"
                style={{ background: "#0e1f2b" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Indicador de swipe */}
                <div className="flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-2xl">🔐</p>
                  <h2 className="text-white font-extrabold text-xl">¿Cómo funciona el ingreso?</h2>
                  <p className="text-white/60 text-sm">Es rápido, gratis y seguro</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: "👤",
                      title: "Entrás con tu cuenta de Google",
                      desc: "Para que los demás usuarios te reconozcan. No compartimos tus datos con nadie ni los usamos para otra cosa.",
                    },
                    {
                      icon: "🌐",
                      title: "Elegí con qué cuenta entrar",
                      desc: "Se abre la pantalla de Google para elegir tu cuenta. Nunca vemos ni guardamos tu contraseña.",
                    },
                    {
                      icon: "🏘️",
                      title: "Es 100% gratuito y de la comunidad",
                      desc: "Monte Carpooling es una app local de Monte. Tus datos quedan en la app y no se usan para nada más.",
                    },
                  ].map((item) => (
                    <div key={item.icon} className="flex gap-3 bg-white/5 rounded-2xl p-3.5">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{item.title}</p>
                        <p className="text-white/60 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={login}
                  className="w-full py-4 rounded-2xl font-bold text-base text-white shadow-xl active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
                >
                  Entendido, ingresar →
                </button>

                <p className="text-white/40 text-[11px] text-center leading-relaxed">
                  Al ingresar aceptás los{" "}
                  <a href="/terminos.html" className="underline">términos</a> y la{" "}
                  <a href="/privacidad.html" className="underline">política de privacidad</a>.
                </p>

                <button
                  onClick={() => setShowLoginExplainer(false)}
                  className="w-full text-white/40 text-sm py-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  if (communityLoading || needsCommunityGate(community)) {
    return <CommunityGate status={community} loading={communityLoading} onDone={() => { refetchCommunity(); }} />;
  }

  const navItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/my-trips", icon: MapPin, label: "Mis viajes" },
    { href: "/create-trip", icon: Car, label: "Publicar" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/profile", icon: User, label: "Perfil" },
  ];

  if (navFlags?.hasGuide) {
    navItems.push({ href: "/guia", icon: Store, label: "Guía" });
  }
  if (user?.roles?.includes("admin") || (user as any)?.isAdmin || navFlags?.isAdmin) {
    navItems.push({ href: "/admin", icon: Shield, label: "Admin" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground max-w-md mx-auto relative shadow-2xl overflow-x-hidden flex flex-col">
      <OnboardingModal />
      <main className="pb-24 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur-xl border-t border-border/50 pb-safe pt-2 px-4 z-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const isPrimary = item.href === "/create-trip";

            if (isPrimary) {
              return (
                <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90"
                      style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-bold text-primary">{item.label}</span>
                  </div>
                </Link>
              );
            }

            const showBadge = item.href === "/my-trips" && pendingCount > 0;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`relative p-2 rounded-xl transition-all duration-300 ${isActive ? "bg-primary/10 scale-110" : "bg-transparent"}`}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
