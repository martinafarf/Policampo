// Ruta /admin/catalogo/cultivos/[id]: editar datos agronómicos de un cultivo (Esp. 03, 5.2).
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { cultivo, cultivoEcorregion } from "@/db/schema";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirAdministrador } from "@/lib/sesion";
import { FormularioCultivo } from "../FormularioCultivo";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoEditarCultivo({ params }: Props) {
  await requerirAdministrador();
  const { id } = await params;
  if (!esUuidValido(id)) {
    notFound();
  }

  const [fila] = await db.select().from(cultivo).where(eq(cultivo.id, id)).limit(1);
  if (!fila) {
    notFound();
  }

  const periodos = await db
    .select()
    .from(cultivoEcorregion)
    .where(eq(cultivoEcorregion.cultivoId, fila.id));

  return (
    <FormularioCultivo
      inicial={{
        ...fila,
        periodos: periodos.map((p) => ({
          ecorregion: p.ecorregion,
          floracionSemanas: p.floracionSemanas,
          cosechaSemanas: p.cosechaSemanas,
        })),
      }}
    />
  );
}

export default function PaginaEditarCultivo(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando cultivo…</p>}>
        <ContenidoEditarCultivo params={props.params} />
      </Suspense>
    </main>
  );
}
