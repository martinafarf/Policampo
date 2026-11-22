// Política de privacidad: versión provisoria. El texto definitivo lo redacta el grupo (pendiente
// de la especificación 01) y lo publica la T7. Si cambia, subir POLITICA_PRIVACIDAD_VERSION.
import { POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";

export const metadata = { title: "Política de privacidad · PoliCampo" };

export default function PaginaPrivacidad() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-campo-oscuro">Política de privacidad</h1>
      <p className="mt-1 text-sm text-tinta-suave">Versión {POLITICA_PRIVACIDAD_VERSION} · borrador provisorio</p>
      <div className="mt-6 flex flex-col gap-4">
        <p>
          PoliCampo guarda solo los datos necesarios para funcionar: tu email, tu nombre de usuario, tu contraseña
          cifrada y, más adelante, los datos de tus fincas. Se usan únicamente para prestarte el servicio, y no se
          venden ni se comparten con terceros para otros fines (Ley 25.326).
        </p>
        <p>
          Para funcionar usamos servicios que procesan los datos en Estados Unidos: Neon (base de datos), Vercel
          (servidores) y Resend (envío de emails). Al registrarte das tu consentimiento expreso para esa transferencia.
        </p>
        <p>
          Podés pedir acceso, rectificación o supresión de tus datos. Desde tu perfil vas a poder eliminar tu cuenta y
          todos sus datos.
        </p>
        <p className="text-sm text-tinta-suave">
          Este texto es provisorio. La versión completa (datos que quedan después de borrar una cuenta, plazos y email
          de contacto) está pendiente.
        </p>
      </div>
    </main>
  );
}
