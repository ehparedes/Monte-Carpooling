import { Layout } from "@/components/layout";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
  return (
    <Layout>
      <div className="p-6 pb-12">
        <header className="flex items-center gap-4 mb-8 mt-4">
          <Link href="/profile">
            <button className="w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-sm border border-border">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-2xl font-extrabold">Legal</h1>
        </header>

        <div className="space-y-8">
          {/* Términos y Condiciones */}
          <section className="bg-card rounded-3xl p-6 border border-border shadow-sm prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1A8EA3" }}>Términos y Condiciones</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Última actualización: marzo 2025</p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">1. Aceptación</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al usar Monte Carpooling aceptás estos Términos y Condiciones. Si no estás de acuerdo, no uses la aplicación.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">2. Descripción del servicio</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Monte Carpooling es una plataforma que conecta conductores y pasajeros de San Miguel del Monte y la Provincia de Buenos Aires para compartir viajes. No somos una empresa de transporte ni tenemos responsabilidad sobre la conducción de los vehículos.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">3. Responsabilidades del conductor</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
              <li>Tener licencia de conducir vigente.</li>
              <li>El vehículo debe tener seguro y VTV al día.</li>
              <li>Respetar las normas de tránsito.</li>
              <li>Tratar a los pasajeros con respeto.</li>
              <li>No conducir bajo efectos de alcohol o drogas.</li>
            </ul>

            <h3 className="font-bold mt-5 mb-2 text-foreground">4. Responsabilidades del pasajero</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
              <li>Respetar al conductor y a los otros pasajeros.</li>
              <li>Presentarse en el punto de encuentro a horario.</li>
              <li>Cancelar la reserva con tiempo si no va a viajar.</li>
              <li>Pagar el monto acordado al conductor.</li>
            </ul>

            <h3 className="font-bold mt-5 mb-2 text-foreground">5. Limitación de responsabilidad</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Monte Carpooling actúa como intermediario y no se responsabiliza por accidentes, robos, cancelaciones, o cualquier daño ocurrido durante el viaje. Los usuarios acuerdan entre ellos las condiciones del viaje.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">6. Calificaciones y reseñas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las calificaciones son opiniones de usuarios y no constituyen endosos de Monte Carpooling. Nos reservamos el derecho de eliminar reseñas que violen nuestras políticas.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">7. Cancelación</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los conductores pueden cancelar viajes con al menos 2 horas de anticipación. Los pasajeros pueden cancelar reservas hasta 1 hora antes del viaje. Los abusos de cancelación pueden resultar en suspensión de la cuenta.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">8. Modificaciones</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos modificar estos términos en cualquier momento. El uso continuado de la app implica aceptación de los nuevos términos.
            </p>
          </section>

          {/* Política de Privacidad */}
          <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#3D7A28" }}>Política de Privacidad</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Última actualización: marzo 2025</p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">Datos que recopilamos</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
              <li><strong>Datos de cuenta:</strong> nombre, apellido, usuario (provistos por Replit Auth).</li>
              <li><strong>Datos de perfil:</strong> DNI, teléfono, datos del vehículo (que vos ingresás voluntariamente).</li>
              <li><strong>Datos de uso:</strong> viajes publicados, reservas realizadas, mensajes de chat.</li>
              <li><strong>Datos de dispositivo:</strong> token de notificaciones push (solo con tu permiso).</li>
            </ul>

            <h3 className="font-bold mt-5 mb-2 text-foreground">Cómo usamos los datos</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
              <li>Para mostrar tu perfil a otros usuarios del pueblo.</li>
              <li>Para notificarte sobre reservas y mensajes.</li>
              <li>Para mejorar la seguridad de la comunidad.</li>
            </ul>

            <h3 className="font-bold mt-5 mb-2 text-foreground">Compartición de datos</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No vendemos ni compartimos tus datos con terceros. Tu nombre y foto de perfil son visibles para otros usuarios de la app.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">Tus derechos</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podés solicitar la eliminación de tu cuenta y tus datos en cualquier momento contactando al administrador. Conforme a la Ley 25.326 de Protección de Datos Personales de Argentina.
            </p>

            <h3 className="font-bold mt-5 mb-2 text-foreground">Contacto</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para consultas sobre privacidad: <a href="mailto:admin@montecarpooling.ar" className="text-primary font-medium">admin@montecarpooling.ar</a>
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
