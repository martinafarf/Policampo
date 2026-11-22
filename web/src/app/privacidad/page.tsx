// Política de privacidad (especificación 01, T7; Ley 25.326 de Protección de Datos Personales).
// BORRADOR para que lo revise el grupo. Si cambia el contenido, subir POLITICA_PRIVACIDAD_VERSION
// (src/lib/privacidad.ts): a quien aceptó la versión anterior se le pide aceptar la nueva.
// El email de contacto sale de EMAIL_CONTACTO (variable de entorno, sección 6.3).
import type { Metadata } from "next";
import { FECHA_POLITICA_PRIVACIDAD, POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";

export const metadata: Metadata = {
  title: "Política de privacidad · PoliCampo",
  description: "Qué datos guarda PoliCampo, para qué, por cuánto tiempo y cómo ejercer tus derechos.",
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-campo-oscuro">{titulo}</h2>
      {children}
    </section>
  );
}

const SERVICIOS = [
  { nombre: "Neon", uso: "Base de datos: guarda tu cuenta y tus fincas.", pais: "Estados Unidos" },
  { nombre: "Vercel", uso: "Servidores donde funciona el sitio.", pais: "Estados Unidos" },
  { nombre: "Google (Gmail)", uso: "Envío de los emails (confirmación, recuperación, avisos).", pais: "Estados Unidos" },
  { nombre: "Esri", uso: "Imágenes satelitales del mapa al dibujar tu finca.", pais: "Estados Unidos" },
];

export default function PaginaPrivacidad() {
  const contacto = process.env.EMAIL_CONTACTO;
  const enlaceContacto = contacto ? (
    <a href={`mailto:${contacto}`} className="font-medium text-campo-oscuro underline break-all">
      {contacto}
    </a>
  ) : (
    "el email de contacto que publicaremos en esta página"
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-campo-oscuro">Política de privacidad</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Versión {POLITICA_PRIVACIDAD_VERSION} · vigente desde el {FECHA_POLITICA_PRIVACIDAD}
      </p>

      <div className="mt-6 flex flex-col gap-8 leading-relaxed">
        <Seccion titulo="Quiénes somos">
          <p>
            PoliCampo es un sistema web de apoyo a la toma de decisiones agroecológicas, desarrollado como proyecto
            académico en la Facultad de Ingeniería de la Universidad Nacional de Jujuy. Somos responsables de los datos
            que cargás en el sitio. Para cualquier consulta sobre tus datos, escribinos a {enlaceContacto}.
          </p>
        </Seccion>

        <Seccion titulo="Qué datos guardamos">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong>Tu cuenta:</strong> email, nombre de usuario, contraseña (guardada cifrada: nadie puede leerla, ni
              nosotros) y, si los cargás, tu nombre y apellido.
            </li>
            <li>
              <strong>Tus fincas:</strong> nombre, dirección, departamento, localidad, superficie, cultivos, sectores y,
              si usás el mapa, el contorno y la ubicación del terreno.
            </li>
            <li>
              <strong>Lo que genera el sistema:</strong> diagnósticos, propuestas, calendarios e informes de tus fincas.
            </li>
            <li>
              <strong>Datos técnicos de seguridad:</strong> la fecha de tus ingresos, cambios de contraseña o de email,
              y la dirección IP y el navegador de tus sesiones abiertas. Los usamos para proteger tu cuenta.
            </li>
          </ul>
          <p>No te pedimos documento, teléfono ni datos de pago, y no usamos cookies de publicidad ni de seguimiento.</p>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>
            Solo para darte el servicio: que puedas ingresar, guardar tus fincas y recibir diagnósticos y propuestas. No
            vendemos ni compartimos tus datos con terceros para otros fines. Los datos se usan con tu consentimiento,
            que das al registrarte (Ley 25.326, artículo 5).
          </p>
        </Seccion>

        <Seccion titulo="Servicios que usamos y transferencia internacional">
          <p>
            Para funcionar, PoliCampo usa estos servicios, que procesan los datos en Estados Unidos. Al registrarte das
            tu consentimiento expreso para esa transferencia (Ley 25.326, artículo 12):
          </p>
          <ul className="flex flex-col gap-2">
            {SERVICIOS.map((servicio) => (
              <li key={servicio.nombre} className="rounded-lg border border-borde bg-white p-3">
                <strong>{servicio.nombre}</strong> ({servicio.pais}): {servicio.uso}
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los guardamos">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Tu cuenta y tus fincas: mientras tengas la cuenta.</li>
            <li>Los registros de seguridad: hasta 90 días.</li>
          </ul>
          <p>
            <strong>Cuando eliminás tu cuenta</strong>, borramos en el momento la cuenta, tus fincas y todo lo que se
            generó a partir de ellas. Algunos rastros técnicos quedan por un tiempo limitado, fuera de nuestro control
            directo:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              las copias de seguridad de la base de datos, que se borran solas en unos días o, si se hicieron antes de
              una actualización del sistema, a los 30 días;
            </li>
            <li>los registros técnicos de los servidores de Vercel, que se borran solos en poco tiempo;</li>
            <li>el historial de envíos de emails de Gmail (a quién se envió y cuándo, no el contenido de tus fincas).</li>
          </ul>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>Según la Ley 25.326 podés, de forma gratuita:</p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong>Acceder</strong> a tus datos: los ves en tu perfil y en tus fincas, o pedinos una copia.
            </li>
            <li>
              <strong>Rectificarlos:</strong> los corregís desde tu perfil y tus fincas.
            </li>
            <li>
              <strong>Suprimirlos:</strong> desde <em>Mi perfil → Eliminar mi cuenta</em> borrás la cuenta y todos sus
              datos.
            </li>
          </ul>
          <p>
            Para cualquiera de estos pedidos también podés escribirnos a {enlaceContacto}. Te respondemos dentro de los
            plazos de la ley (10 días para el acceso y 5 días hábiles para la rectificación o supresión).
          </p>
          <p className="text-sm text-tinta-suave">
            La Agencia de Acceso a la Información Pública (AAIP), como órgano de control de la Ley 25.326, atiende las
            denuncias y reclamos por incumplimiento de las normas de protección de datos personales.
          </p>
        </Seccion>

        <Seccion titulo="Seguridad">
          <p>
            Las contraseñas se guardan cifradas, la conexión con el sitio es segura (HTTPS) y cada persona solo puede ver
            sus propias fincas. Te avisamos por email cuando cambia tu contraseña o tu email.
          </p>
        </Seccion>

        <Seccion titulo="Cambios en esta política">
          <p>
            Si cambiamos esta política, le subimos el número de versión y te pedimos que aceptes la nueva la próxima vez
            que ingreses.
          </p>
        </Seccion>
      </div>
    </main>
  );
}
