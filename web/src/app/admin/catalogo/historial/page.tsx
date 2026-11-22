// Ruta /admin/catalogo/historial: registro inmutable de cambios del catálogo (Esp. 03, 5.5, CA-03-15, 16).
// Solo lectura para administradores; sin rol responde 404.
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { cambioCatalogo, user } from "@/db/schema";
import {
  ENTIDADES_CATALOGO,
  calcularDiferenciasCatalogo,
  type AccionCatalogo,
  type EntidadCatalogo,
} from "@/dominio/catalogo";
import { requerirAdministrador } from "@/lib/sesion";

const ETIQUETA_ENTIDAD: Readonly<Record<EntidadCatalogo, string>> = {
  planta_servicio: "Planta de servicio",
  cultivo: "Cultivo",
  compatibilidad: "Compatibilidad",
};

const ETIQUETA_ACCION: Readonly<Record<AccionCatalogo, string>> = {
  alta: "Alta",
  edicion: "Edición",
  publicacion: "Publicación",
  retiro: "Retiro",
  borrado: "Borrado",
  importacion: "Importación CSV",
};

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string" || typeof valor === "number") return String(valor);
  return JSON.stringify(valor);
}

interface Props {
  searchParams: Promise<{ entidad?: string; admin?: string }>;
}

async function ContenidoHistorial({ searchParams }: Props) {
  await requerirAdministrador();
  const filtros = await searchParams;

  const entidadFiltro = (ENTIDADES_CATALOGO as readonly string[]).includes(filtros.entidad ?? "")
    ? (filtros.entidad as EntidadCatalogo)
    : null;
  const adminFiltro = filtros.admin?.trim() || null;

  const condiciones = [];
  if (entidadFiltro) condiciones.push(eq(cambioCatalogo.entidad, entidadFiltro));
  if (adminFiltro) condiciones.push(eq(cambioCatalogo.administradorId, adminFiltro));

  const [registros, administradores] = await Promise.all([
    db
      .select({
        id: cambioCatalogo.id,
        entidad: cambioCatalogo.entidad,
        entidadId: cambioCatalogo.entidadId,
        accion: cambioCatalogo.accion,
        fecha: cambioCatalogo.fecha,
        antes: cambioCatalogo.antes,
        despues: cambioCatalogo.despues,
        motivo: cambioCatalogo.motivo,
        adminUsuario: user.displayUsername,
        adminUsername: user.username,
        adminName: user.name,
      })
      .from(cambioCatalogo)
      .leftJoin(user, eq(user.id, cambioCatalogo.administradorId))
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(desc(cambioCatalogo.fecha))
      .limit(200),
    db
      .select({
        id: user.id,
        displayUsername: user.displayUsername,
        username: user.username,
        name: user.name,
      })
      .from(user)
      .where(eq(user.role, "administrador")),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/catalogo"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver al resumen del catálogo
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Historial de cambios del catálogo</h1>
        <p className="text-sm text-stone-600">
          Registro de auditoría de solo lectura (RN-07, RN-13). No se edita ni se borra.
        </p>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
        <select
          name="entidad"
          defaultValue={entidadFiltro ?? ""}
          aria-label="Filtrar por entidad"
          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Todas las entidades</option>
          {ENTIDADES_CATALOGO.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ENTIDAD[e]}
            </option>
          ))}
        </select>

        <select
          name="admin"
          defaultValue={adminFiltro ?? ""}
          aria-label="Filtrar por administrador"
          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Todos los administradores</option>
          {administradores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayUsername || a.username || a.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-10 rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-900"
        >
          Filtrar
        </button>
      </form>

      {registros.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Todavía no hay cambios registrados con esos filtros.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {registros.map((reg) => {
            const nombreAdmin =
              reg.adminUsuario || reg.adminUsername || reg.adminName || "Administrador eliminado";
            const diffs = calcularDiferenciasCatalogo(reg.antes, reg.despues);

            return (
              <li
                key={reg.id}
                className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-900">
                      {ETIQUETA_ACCION[reg.accion]}
                    </span>
                    <span className="font-semibold text-stone-800">
                      {ETIQUETA_ENTIDAD[reg.entidad]}
                    </span>
                    <span className="text-stone-500">por {nombreAdmin}</span>
                  </div>
                  <time className="text-stone-500" dateTime={reg.fecha.toISOString()}>
                    {reg.fecha.toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                {reg.motivo ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
                    <strong>Motivo:</strong> {reg.motivo}
                  </p>
                ) : null}

                {diffs.length > 0 ? (
                  <dl className="mt-1 grid grid-cols-1 gap-1.5 border-t border-stone-100 pt-2 text-xs">
                    {diffs.slice(0, 12).map((d) => (
                      <div key={d.campo} className="break-words">
                        <dt className="inline font-semibold text-stone-700">{d.campo}: </dt>
                        <dd className="inline text-stone-600">
                          <span className="line-through opacity-70">{formatearValor(d.antes)}</span>{" "}
                          → <strong className="text-stone-900">{formatearValor(d.despues)}</strong>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PaginaHistorialCatalogo(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando historial…</p>}>
        <ContenidoHistorial searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
