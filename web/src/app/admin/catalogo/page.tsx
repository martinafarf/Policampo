// Ruta /admin/catalogo: resumen del backoffice del catálogo de especies (Esp. 03, sección 6).
// Acceso exclusivo para administradores (RS-03, CA-03-16: sin rol responde 404).
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { compatibilidad, cultivo, plantaServicio } from "@/db/schema";
import { requerirAdministrador } from "@/lib/sesion";

function contarPorEstado(filas: { estado: string }[]) {
  const conteo = { borrador: 0, publicado: 0, retirado: 0 };
  for (const f of filas) {
    if (f.estado === "borrador") conteo.borrador += 1;
    else if (f.estado === "publicado") conteo.publicado += 1;
    else if (f.estado === "retirado") conteo.retirado += 1;
  }
  return conteo;
}

async function ContenidoResumenCatalogo() {
  await requerirAdministrador();

  const [plantas, cultivos, compatibilidades] = await Promise.all([
    db.select({ estado: plantaServicio.estado }).from(plantaServicio),
    db.select({ estado: cultivo.estado }).from(cultivo),
    db.select({ estado: compatibilidad.estado }).from(compatibilidad),
  ]);

  const tarjetas = [
    {
      titulo: "Plantas de servicio",
      descripcion: "Especies florales, coberturas y períodos por ecorregión.",
      conteo: contarPorEstado(plantas),
      href: "/admin/catalogo/plantas",
      disponible: true,
    },
    {
      titulo: "Cultivos",
      descripcion: "Dependencia de polinización y semanas de floración/cosecha.",
      conteo: contarPorEstado(cultivos),
      href: "/admin/catalogo/cultivos",
      disponible: true,
    },
    {
      titulo: "Compatibilidades",
      descripcion: "Matriz cultivo–planta (−5 a +5) con justificación agronómica.",
      conteo: contarPorEstado(compatibilidades),
      href: "/admin/catalogo/compatibilidades",
      disponible: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Administración
          </p>
          <h1 className="text-2xl font-bold text-stone-900">Catálogo de especies</h1>
          <p className="text-sm text-stone-600">
            Solo los registros en estado <strong>Publicado</strong> se usan para recomendar y se
            muestran en la Guía de especies (RN-13).
          </p>
        </div>
        <Link
          href="/admin/catalogo/plantas/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva planta
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <section
            key={t.titulo}
            className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
          >
            <div>
              <h2 className="text-lg font-bold text-stone-900">{t.titulo}</h2>
              <p className="mt-1 text-xs text-stone-600">{t.descripcion}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center text-xs">
                <div>
                  <dt className="text-stone-500">Borrador</dt>
                  <dd className="mt-0.5 text-base font-bold text-stone-800">{t.conteo.borrador}</dd>
                </div>
                <div>
                  <dt className="text-emerald-700">Publicado</dt>
                  <dd className="mt-0.5 text-base font-bold text-emerald-800">
                    {t.conteo.publicado}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-400">Retirado</dt>
                  <dd className="mt-0.5 text-base font-bold text-stone-500">{t.conteo.retirado}</dd>
                </div>
              </dl>
            </div>

            {t.disponible ? (
              <Link
                href={t.href}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Administrar →
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-500">
                Próxima etapa (T3)
              </span>
            )}
          </section>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-stone-900">Historial de cambios</h2>
            <p className="text-xs text-stone-600">
              Auditoría completa de altas, ediciones, publicaciones y retiros (RN-13).
            </p>
          </div>
          <Link
            href="/admin/catalogo/historial"
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-stone-300 px-3.5 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Ver historial →
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-stone-900">Importar y exportar CSV</h2>
            <p className="text-xs text-stone-600">
              Carga masiva con vista previa en Borrador y exportación segura.
            </p>
          </div>
          <span className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-500">
            Próxima etapa (T5)
          </span>
        </div>
      </section>
    </div>
  );
}

export default function PaginaAdminCatalogo() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando catálogo…</p>}>
        <ContenidoResumenCatalogo />
      </Suspense>
    </main>
  );
}
