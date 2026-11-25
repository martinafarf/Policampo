// Junta todo lo que hace falta para saber en qué paso está una finca (terreno, diagnóstico, rediseño,
// calendario, informe). Lo usan la ficha de la finca y Herramientas ("Lo que sigue"), así la regla es
// una sola. La decisión de cada estado está en ../[id]/pasos.ts (función pura, con tests).
import "server-only";
import { obtenerHoyJujuyIso } from "@/dominio/calendario";
import { obtenerCalendarioActivoDeFinca } from "@/dominio/calendario/servicio";
import { evaluarRequisitosDiagnostico } from "@/dominio/diagnostico";
import { obtenerResumenDiagnosticosPorEstablecimientos } from "@/dominio/diagnostico/entrada";
import { listarInformesDeFinca } from "@/dominio/informe/foto";
import { obtenerPropuestaElegidaDeFinca } from "@/dominio/propuesta/servicio";
import { calcularPasosFinca } from "../[id]/pasos";
import { obtenerEstablecimientoDelUsuario } from "./consultas";

/** null si la finca no existe o no es del usuario (RS-02). */
export async function obtenerEstadoDeFinca(fincaId: string, usuarioId: string) {
  const finca = await obtenerEstablecimientoDelUsuario(fincaId, usuarioId);
  if (!finca) return null;

  const [resumenesDiag, propuestaElegida, datosInformes] = await Promise.all([
    obtenerResumenDiagnosticosPorEstablecimientos([{ id: finca.id, actualizadoEn: finca.actualizadoEn }]),
    obtenerPropuestaElegidaDeFinca(finca.id),
    listarInformesDeFinca(finca.id, usuarioId),
  ]);
  // El calendario solo existe si hay una propuesta elegida: si no, no hace falta consultarlo.
  const calendarioActivo = propuestaElegida
    ? await obtenerCalendarioActivoDeFinca(finca.id, usuarioId, obtenerHoyJujuyIso())
    : null;

  const resumenDiag = resumenesDiag.get(finca.id) ?? null;
  const cantidadCultivos = finca.sectores.filter((s) => s.tipo === "cultivo").length;
  const requisitosDiag = evaluarRequisitosDiagnostico({
    superficieTotalHa: finca.superficieTotalHa,
    cantidadSectoresCultivo: cantidadCultivos,
  });

  const pasos = calcularPasosFinca({
    terrenoCompleto: requisitosDiag.cumple,
    faltaEnTerreno: requisitosDiag.cumple ? null : requisitosDiag.mensajeFaltante,
    diagnostico: resumenDiag ? { desactualizado: resumenDiag.desactualizado } : null,
    tienePropuestaElegida: propuestaElegida !== null,
    tieneCalendario: Boolean(calendarioActivo?.calendario),
    cantidadInformes: datosInformes?.informes.length ?? 0,
  });

  return {
    finca,
    cantidadCultivos,
    resumenDiag,
    propuestaElegida,
    requisitosInforme: datosInformes?.requisitos ?? null,
    cantidadInformes: datosInformes?.informes.length ?? 0,
    pasos,
  };
}
