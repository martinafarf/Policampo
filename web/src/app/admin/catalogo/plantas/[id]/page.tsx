// Ruta /admin/catalogo/plantas/[id]: editar, publicar, retirar o borrar borrador (Esp. 03, T2).
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { plantaServicio, plantaServicioEcorregion } from "@/db/schema";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirAdministrador } from "@/lib/sesion";
import { FormularioPlanta } from "../FormularioPlanta";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoEditarPlanta({ params }: Props) {
  await requerirAdministrador();
  const { id } = await params;
  if (!esUuidValido(id)) {
    notFound();
  }

  const [planta] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.id, id))
    .limit(1);

  if (!planta) {
    notFound();
  }

  const periodos = await db
    .select()
    .from(plantaServicioEcorregion)
    .where(eq(plantaServicioEcorregion.plantaId, planta.id));

  return (
    <FormularioPlanta
      inicial={{
        ...planta,
        periodos: periodos.map((p) => ({
          ecorregion: p.ecorregion,
          siembraSemanas: p.siembraSemanas,
          floracionSemanas: p.floracionSemanas,
          corteSemanas: p.corteSemanas,
          semanasHastaFloracionMin: p.semanasHastaFloracionMin,
          semanasHastaFloracionMax: p.semanasHastaFloracionMax,
        })),
      }}
    />
  );
}

export default function PaginaEditarPlanta(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando planta…</p>}>
        <ContenidoEditarPlanta params={props.params} />
      </Suspense>
    </main>
  );
}
