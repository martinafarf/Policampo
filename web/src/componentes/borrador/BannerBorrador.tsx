"use client";

// Aviso para recuperar o descartar cambios locales sin guardar (Esp. 02, 5.6, CA-02-17).

interface Props {
  fechaBorradorIso: string | null;
  ultimoAutoguardadoIso: string | null;
  onRecuperar: () => void;
  onDescartar: () => void;
}

function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BannerBorrador({
  fechaBorradorIso,
  ultimoAutoguardadoIso,
  onRecuperar,
  onDescartar,
}: Props) {
  if (fechaBorradorIso) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="font-medium">
          Tenés cambios sin guardar del{" "}
          <strong>{formatearFechaHora(fechaBorradorIso)}</strong>. ¿Recuperarlos?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRecuperar}
            className="min-h-10 rounded-lg bg-amber-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Recuperar
          </button>
          <button
            type="button"
            onClick={onDescartar}
            className="min-h-10 rounded-lg border border-amber-400 bg-white px-3.5 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  if (ultimoAutoguardadoIso) {
    return (
      <p className="text-right text-xs text-stone-500">
        Borrador guardado en este dispositivo a las {formatearHora(ultimoAutoguardadoIso)}.
      </p>
    );
  }

  return null;
}
