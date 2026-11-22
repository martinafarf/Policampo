// Mi perfil (especificación 01, flujo 4.6, T5): datos, contraseña, email y eliminar la cuenta.
// Todo lo que lee la sesión va dentro de <Suspense> (Next.js 16, Cache Components).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CasillaResumenSemanal } from "@/componentes/calendario/CasillaResumenSemanal";
import { Aviso } from "@/componentes/ui/formulario";
import { obtenerPreferenciaResumenSemanal } from "@/dominio/calendario/servicio";
import { datosDelPerfil } from "@/lib/perfil";
import { requerirUsuario } from "@/lib/sesion";
import { FormularioContrasena, FormularioEliminar, FormularioEmail, FormularioNombre } from "./formularios";

export const metadata: Metadata = { title: "Mi perfil · PoliCampo" };

type Busqueda = { email?: string; error?: string };

function Seccion({ titulo, peligro = false, children }: { titulo: string; peligro?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 ${peligro ? "border-error" : "border-borde"}`}>
      <h2 className={`mb-4 text-lg font-semibold ${peligro ? "text-error" : ""}`}>{titulo}</h2>
      {children}
    </section>
  );
}

/** Resultado del enlace de cambio de email: Better Auth vuelve acá con ?email=cambiado o con ?error=... */
function AvisoCambioEmail({ busqueda }: { busqueda: Busqueda }) {
  if (busqueda.error) {
    return (
      <Aviso tipo="error">
        El enlace para cambiar el email venció o ya fue usado. Si todavía querés cambiarlo, pedilo de nuevo abajo.
      </Aviso>
    );
  }
  if (busqueda.email === "cambiado") return <Aviso tipo="exito">Listo: cambiaste el email de tu cuenta.</Aviso>;
  return null;
}

async function Contenido({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const usuario = await requerirUsuario("/perfil", { sinConsentimiento: true });
  const [perfil, resumenSemanalActivo, busqueda] = await Promise.all([
    datosDelPerfil(usuario.id),
    obtenerPreferenciaResumenSemanal(usuario.id),
    searchParams,
  ]);
  if (!perfil) notFound();
  return (
    <div className="flex flex-col gap-6">
      <AvisoCambioEmail busqueda={busqueda} />

      <Seccion titulo="Tus datos">
        <dl className="mb-4 grid gap-1 text-sm">
          <dt className="text-tinta-suave">Nombre de usuario (no se puede cambiar)</dt>
          <dd className="mb-2 font-medium">{perfil.usuario}</dd>
          <dt className="text-tinta-suave">Email</dt>
          <dd className="font-medium break-all">{perfil.email}</dd>
        </dl>
        <FormularioNombre nombre={perfil.nombre} apellido={perfil.apellido} />
      </Seccion>

      <Seccion titulo="Cambiar la contraseña">
        <FormularioContrasena />
      </Seccion>

      <Seccion titulo="Cambiar el email">
        <p className="mb-4 text-sm text-tinta-suave">
          Te mandamos un enlace al email nuevo. El cambio se hace cuando lo abrís, y avisamos a tu email actual.
        </p>
        <FormularioEmail />
      </Seccion>

      <Seccion titulo="Resumen semanal de tareas">
        <CasillaResumenSemanal inicial={resumenSemanalActivo} />
      </Seccion>

      <Seccion titulo="Eliminar mi cuenta" peligro>
        <p className="mb-2 text-sm">
          Se borran tu cuenta y <strong>todos tus datos</strong>: establecimientos, diagnósticos, propuestas e informes.
        </p>
        <p className="mb-4 text-sm font-semibold text-error">No se puede deshacer.</p>
        <FormularioEliminar />
      </Seccion>
    </div>
  );
}

export default function PaginaPerfil({ searchParams }: PageProps<"/perfil">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-campo-oscuro">Mi perfil</h1>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Contenido searchParams={searchParams as Promise<Busqueda>} />
      </Suspense>
    </main>
  );
}
