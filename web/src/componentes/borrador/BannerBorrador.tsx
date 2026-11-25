"use client";

// Aviso para recuperar o descartar cambios locales sin guardar (Esp. 02, 5.6, CA-02-17).
// Solo aparece al VOLVER a la pantalla después de haberla dejado sin guardar (no mientras se está cargando).
// El tono es amable (verde suave, sin ícono de alerta): no es un error, la persona no hizo nada mal.
import { IconoInfo } from "@/componentes/marca/Iconos";
import { Boton } from "@/componentes/ui/boton";

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
    hour12: false,
  });
}

function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
        className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-menta-fuerte bg-menta px-4 py-3 text-[0.95rem] text-bosque sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="flex items-start gap-3 font-semibold">
          <IconoInfo className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Encontramos lo que estabas cargando ({formatearFechaHora(fechaBorradorIso)}). ¿Querés seguir desde ahí?
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={onRecuperar} className="min-h-11 px-5">
            Seguir desde ahí
          </Boton>
          <Boton variante="contorno" onClick={onDescartar} className="min-h-11 px-5">
            Descartar
          </Boton>
        </div>
      </div>
    );
  }

  if (ultimoAutoguardadoIso) {
    return (
      <p className="text-right text-sm text-tinta-suave">
        Borrador guardado en este dispositivo a las {formatearHora(ultimoAutoguardadoIso)}.
      </p>
    );
  }

  return null;
}
