"use server";

// Acciones del servidor para establecimientos (especificación 02, tarea T2).
// Toda acción verifica sesión y dueño en el servidor (RS-02, RS-06, RS-15).
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { establecimiento, sector } from "@/db/schema";
import {
  LIMITES_ESTABLECIMIENTO,
  RUTA_EDICION_METODO,
  coincideNombreParaBorrar,
  esUuidValido,
  validarDatosEstablecimiento,
  validarSumaSuperficies,
  type ErroresDatosEstablecimiento,
} from "@/dominio/establecimientos";
import { exigirUsuarioActual } from "./_lib/sesion";

export interface EstadoFormularioEstablecimiento {
  errores: ErroresDatosEstablecimiento;
}

export interface EstadoBorradoEstablecimiento {
  error?: string;
  eliminado?: boolean;
  nombreEliminado?: string;
}

function leerTexto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor : "";
}

function esErrorUnicoNombre(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const codigo =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : "";
  return codigo === "23505";
}

export async function crearEstablecimiento(
  _estadoPrevio: EstadoFormularioEstablecimiento,
  formData: FormData,
): Promise<EstadoFormularioEstablecimiento> {
  const usuario = await exigirUsuarioActual("/fincas/nueva");

  const localidadEsOtra = leerTexto(formData, "localidadEsOtra") === "true";
  const localidad = localidadEsOtra
    ? leerTexto(formData, "localidadOtra")
    : leerTexto(formData, "localidad");

  const validacion = validarDatosEstablecimiento({
    nombre: leerTexto(formData, "nombre"),
    direccion: leerTexto(formData, "direccion"),
    departamento: leerTexto(formData, "departamento"),
    localidad,
    localidadEsOtra,
    ecorregion: leerTexto(formData, "ecorregion"),
    metodoCaracterizacion: leerTexto(formData, "metodoCaracterizacion"),
    superficieTotalTexto: leerTexto(formData, "superficieTotalHa"),
  });

  if (!validacion.valido) {
    return { errores: validacion.errores };
  }

  const { datos } = validacion;

  // Tope de establecimientos por usuario (sección 7.2).
  const [{ total }] = await db
    .select({ total: count(establecimiento.id) })
    .from(establecimiento)
    .where(eq(establecimiento.usuarioId, usuario.id));

  if (Number(total) >= LIMITES_ESTABLECIMIENTO.maxEstablecimientosPorUsuario) {
    return {
      errores: {
        general: `Alcanzaste el límite de ${LIMITES_ESTABLECIMIENTO.maxEstablecimientosPorUsuario} fincas por cuenta.`,
      },
    };
  }

  // Nombre único por usuario sin distinguir mayúsculas (CA-02-02).
  const [duplicado] = await db
    .select({ id: establecimiento.id })
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.usuarioId, usuario.id),
        sql`lower(${establecimiento.nombre}) = lower(${datos.nombre})`,
      ),
    )
    .limit(1);

  if (duplicado) {
    return {
      errores: {
        nombre: "Ya tenés una finca con ese nombre. Elegí otro nombre.",
      },
    };
  }

  let creadoId: string;
  try {
    const [creado] = await db
      .insert(establecimiento)
      .values({
        usuarioId: usuario.id,
        nombre: datos.nombre,
        direccion: datos.direccion,
        departamento: datos.departamento,
        localidad: datos.localidad,
        localidadEsOtra: datos.localidadEsOtra,
        ecorregion: datos.ecorregion,
        metodoCaracterizacion: datos.metodoCaracterizacion,
        superficieTotalHa:
          datos.superficieTotalHa !== null ? datos.superficieTotalHa.toFixed(4) : null,
        contorno: null,
        version: 1,
      })
      .returning({ id: establecimiento.id });

    creadoId = creado.id;
  } catch (error) {
    if (esErrorUnicoNombre(error)) {
      return {
        errores: {
          nombre: "Ya tenés una finca con ese nombre. Elegí otro nombre.",
        },
      };
    }
    throw error;
  }

  revalidatePath("/fincas");
  redirect(`/fincas/${creadoId}/${RUTA_EDICION_METODO[datos.metodoCaracterizacion]}`);
}

export async function actualizarDatosGenerales(
  establecimientoId: string,
  _estadoPrevio: EstadoFormularioEstablecimiento,
  formData: FormData,
): Promise<EstadoFormularioEstablecimiento> {
  const usuario = await exigirUsuarioActual(`/fincas/${establecimientoId}/datos`);

  if (!esUuidValido(establecimientoId)) {
    notFound();
  }

  const [actual] = await db
    .select()
    .from(establecimiento)
    .where(
      and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuario.id)),
    )
    .limit(1);

  if (!actual) {
    notFound();
  }

  const versionEnviada = Number.parseInt(leerTexto(formData, "version"), 10);
  if (!Number.isInteger(versionEnviada) || versionEnviada < 1) {
    return {
      errores: {
        general: "La finca cambió en otro dispositivo. Recargá la página e intentá de nuevo.",
      },
    };
  }

  const localidadEsOtra = leerTexto(formData, "localidadEsOtra") === "true";
  const localidad = localidadEsOtra
    ? leerTexto(formData, "localidadOtra")
    : leerTexto(formData, "localidad");

  // El método de caracterización NO cambia acá (RN-03): se valida con el método actual de la finca.
  const validacion = validarDatosEstablecimiento({
    nombre: leerTexto(formData, "nombre"),
    direccion: leerTexto(formData, "direccion"),
    departamento: leerTexto(formData, "departamento"),
    localidad,
    localidadEsOtra,
    ecorregion: leerTexto(formData, "ecorregion"),
    metodoCaracterizacion: actual.metodoCaracterizacion,
    superficieTotalTexto:
      actual.metodoCaracterizacion === "mapa" ? null : leerTexto(formData, "superficieTotalHa"),
  });

  if (!validacion.valido) {
    return { errores: validacion.errores };
  }

  const { datos } = validacion;

  // En cuestionario y croquis, la nueva superficie total no puede quedar por debajo de la suma de sectores (RN-06).
  if (datos.superficieTotalHa !== null) {
    const sectoresExistentes = await db
      .select({ superficieHa: sector.superficieHa })
      .from(sector)
      .where(eq(sector.establecimientoId, actual.id));

    if (sectoresExistentes.length > 0) {
      const chequeoSuma = validarSumaSuperficies(
        datos.superficieTotalHa,
        sectoresExistentes.map((s) => Number(s.superficieHa)),
      );
      if (!chequeoSuma.valida) {
        return {
          errores: {
            superficieTotalHa:
              chequeoSuma.mensaje ??
              "La superficie total no puede ser menor que la suma de los sectores cargados.",
          },
        };
      }
    }
  }

  // Nombre único por usuario excluyendo esta misma finca (CA-02-02).
  const [duplicado] = await db
    .select({ id: establecimiento.id })
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.usuarioId, usuario.id),
        ne(establecimiento.id, actual.id),
        sql`lower(${establecimiento.nombre}) = lower(${datos.nombre})`,
      ),
    )
    .limit(1);

  if (duplicado) {
    return {
      errores: {
        nombre: "Ya tenés otra finca con ese nombre. Elegí otro nombre.",
      },
    };
  }

  // En mapa se conserva la superficie total calculada del contorno (nunca se pisa desde datos generales).
  const nuevaSuperficie =
    actual.metodoCaracterizacion === "mapa"
      ? actual.superficieTotalHa
      : datos.superficieTotalHa !== null
        ? datos.superficieTotalHa.toFixed(4)
        : null;

  try {
    // Control de versión optimista (RS-15, CA-02-24): solo actualiza si nadie guardó antes.
    const actualizados = await db
      .update(establecimiento)
      .set({
        nombre: datos.nombre,
        direccion: datos.direccion,
        departamento: datos.departamento,
        localidad: datos.localidad,
        localidadEsOtra: datos.localidadEsOtra,
        ecorregion: datos.ecorregion,
        superficieTotalHa: nuevaSuperficie,
        version: versionEnviada + 1,
        actualizadoEn: new Date(),
      })
      .where(
        and(
          eq(establecimiento.id, actual.id),
          eq(establecimiento.usuarioId, usuario.id),
          eq(establecimiento.version, versionEnviada),
        ),
      )
      .returning({ id: establecimiento.id });

    if (actualizados.length === 0) {
      return {
        errores: {
          general: "La finca cambió en otro dispositivo. Recargá la página para ver la versión actual.",
        },
      };
    }
  } catch (error) {
    if (esErrorUnicoNombre(error)) {
      return {
        errores: {
          nombre: "Ya tenés otra finca con ese nombre. Elegí otro nombre.",
        },
      };
    }
    throw error;
  }

  revalidatePath("/fincas");
  revalidatePath(`/fincas/${actual.id}`);
  redirect(`/fincas/${actual.id}?aviso=datos-guardados`);
}

export async function borrarEstablecimiento(
  establecimientoId: string,
  _estadoPrevio: EstadoBorradoEstablecimiento,
  formData: FormData,
): Promise<EstadoBorradoEstablecimiento> {
  const usuario = await exigirUsuarioActual(`/fincas/${establecimientoId}`);

  if (!esUuidValido(establecimientoId)) {
    notFound();
  }

  const [actual] = await db
    .select({ id: establecimiento.id, nombre: establecimiento.nombre })
    .from(establecimiento)
    .where(
      and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuario.id)),
    )
    .limit(1);

  if (!actual) {
    notFound();
  }

  const confirmacion = leerTexto(formData, "confirmacionNombre");
  if (!coincideNombreParaBorrar(actual.nombre, confirmacion)) {
    return {
      error: "Escribí el nombre exacto de la finca para confirmar que querés borrarla.",
    };
  }

  // Borrado definitivo con ON DELETE CASCADE en sectores (CA-02-20).
  await db
    .delete(establecimiento)
    .where(and(eq(establecimiento.id, actual.id), eq(establecimiento.usuarioId, usuario.id)));

  revalidatePath("/fincas");
  return { eliminado: true, nombreEliminado: actual.nombre };
}
