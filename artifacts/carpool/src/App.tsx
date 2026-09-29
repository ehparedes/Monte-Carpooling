import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import MyTrips from "@/pages/my-trips";
import TripDetail from "@/pages/trip-detail";
import CreateTrip from "@/pages/create-trip";
import Profile from "@/pages/profile";
import ChatList from "@/pages/chat-list";
import ChatThread from "@/pages/chat-thread";
import AdminPanel from "@/pages/admin";
import Terms from "@/pages/terms";
import SolicitarViaje from "@/pages/solicitar-viaje";
import Guia from "@/pages/guia";
import AdminSponsors from "@/pages/admin-sponsors";
import AdminComunidad from "@/pages/admin-comunidad";
import Invitacion from "@/pages/invitacion";
import Invitar from "@/pages/invitar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/my-trips" component={MyTrips} />
      <Route path="/trip/:id" component={TripDetail} />
      <Route path="/create-trip" component={CreateTrip} />
      <Route path="/chat" component={ChatList} />
      <Route path="/chat/:id" component={ChatThread} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/comunidad" component={AdminComunidad} />
      <Route path="/admin/sponsors" component={AdminSponsors} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/guia" component={Guia} />
      <Route path="/i/:code" component={Invitacion} />
      <Route path="/invitar" component={Invitar} />
      <Route path="/terms" component={Terms} />
      <Route path="/solicitar-viaje" component={SolicitarViaje} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
