// Ruta /admin/catalogo/compatibilidades: matriz cultivo × planta (Esp. 03, 5.3, CA-03-09, 16).
import { asc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { compatibilidad, cultivo, plantaServicio } from "@/db/schema";
import { requerirAdministrador } from "@/lib/sesion";
import { MatrizCompatibilidades } from "./MatrizCompatibilidades";

async function ContenidoMatriz() {
  await requerirAdministrador();

  const [cultivos, plantas, compatibilidades] = await Promise.all([
    db
      .select({ id: cultivo.id, nombre: cultivo.nombre, estado: cultivo.estado })
      .from(cultivo)
      .orderBy(asc(cultivo.nombre)),
    db
      .select({
        id: plantaServicio.id,
        nombre: plantaServicio.nombreComun,
        estado: plantaServicio.estado,
      })
      .from(plantaServicio)
      .orderBy(asc(plantaServicio.nombreComun)),
    db.select().from(compatibilidad),
  ]);

  return (
    <MatrizCompatibilidades
      cultivos={cultivos}
      plantas={plantas}
      compatibilidades={compatibilidades}
    />
  );
}

export default function PaginaCompatibilidades() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando matriz…</p>}>
        <ContenidoMatriz />
      </Suspense>
    </main>
  );
}
