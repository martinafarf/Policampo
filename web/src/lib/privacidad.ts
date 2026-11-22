// Versión vigente de la política de privacidad (especificación 01). Si cambia el texto de
// /privacidad, se sube la versión: el consentimiento guarda qué versión aceptó cada usuario, y quien
// aceptó una anterior (o ninguna) tiene que aceptar la nueva al ingresar (sección 8, Ley 25.326).
//
// Historial:
// - "1": texto provisorio del registro (T3).
// - "2": texto completo (T7).
export const POLITICA_PRIVACIDAD_VERSION = "2";
export const FECHA_POLITICA_PRIVACIDAD = "22 de noviembre de 2026";

/** ¿El usuario tiene aceptada la versión vigente? */
export function politicaVigenteAceptada(versionAceptada: string | null | undefined): boolean {
  return versionAceptada === POLITICA_PRIVACIDAD_VERSION;
}
