// Ruta /admin/catalogo/cultivos: listado de cultivos del catálogo (Esp. 03, 5.2, CA-03-04, 16).
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeEstadoCatalogo } from "@/componentes/catalogo/BadgeEstadoCatalogo";
import { db } from "@/db";
import { cultivo } from "@/db/schema";
import { ETIQUETAS_DEPENDENCIA_POLINIZACION } from "@/dominio/catalogo";
import { requerirAdministrador } from "@/lib/sesion";

async function ContenidoCultivos() {
  await requerirAdministrador();
  const filas = await db.select().from(cultivo).orderBy(asc(cultivo.nombre));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/catalogo"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← Volver al resumen del catálogo
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Cultivos</h1>
        </div>
        <Link
          href="/admin/catalogo/cultivos/nuevo"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nuevo cultivo
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {filas.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 break-words">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">{c.nombre}</h2>
                <BadgeEstadoCatalogo estado={c.estado} />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.activo ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {c.activo ? "Activo en fincas" : "Inactivo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                Dependencia de polinización:{" "}
                <strong>
                  {c.dependenciaPolinizacion
                    ? ETIQUETAS_DEPENDENCIA_POLINIZACION[c.dependenciaPolinizacion]
                    : "Sin definir"}
                </strong>
              </p>
            </div>
            <Link
              href={`/admin/catalogo/cultivos/${c.id}`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-emerald-700 px-4 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Editar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PaginaCultivosCatalogo() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando cultivos…</p>}>
        <ContenidoCultivos />
      </Suspense>
    </main>
  );
}
