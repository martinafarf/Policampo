"use client";

// Aviso para recuperar o descartar cambios locales sin guardar (Esp. 02, 5.6, CA-02-17).
// Usa los botones y el color de aviso de las pantallas internas (ámbar suave, con ícono).
import { IconoAlerta } from "@/componentes/marca/Iconos";
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
        className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-3 text-[0.95rem] text-[#7a4100] sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="flex items-start gap-3 font-semibold">
          <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
          <span>Tenés cambios sin guardar del {formatearFechaHora(fechaBorradorIso)}. ¿Querés recuperarlos?</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={onRecuperar} className="min-h-11 px-5">
            Recuperar
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
