// Borde ondulado que une una sección con la siguiente (como en las referencias de docs/diseno/).
// La ola es el doble de ancha que la pantalla y se desplaza la mitad en bucle: así el movimiento no
// tiene cortes. Es solo decoración (aria-hidden) y se queda quieta con "reducir movimiento".

// Una ola que se repite cada 480 px, dibujada en 2880 px (= 2 × 1440).
const OLA = "M0 40 Q240 10 480 40 T960 40 T1440 40 T1920 40 T2400 40 T2880 40 V70 H0Z";
const OLA_LENTA = "M0 35 Q180 5 360 35 T720 35 T1080 35 T1440 35 T1800 35 T2160 35 T2520 35 T2880 35 V70 H0Z";

type Props = {
  /** Color de la sección que sigue (o la anterior si va "arriba"), como variable CSS. */
  color: string;
  /** "abajo": la ola cierra la sección por abajo. "arriba": la abre por arriba. */
  lado: "arriba" | "abajo";
  /** Agrega una segunda ola más lenta y transparente detrás. */
  doble?: boolean;
};

export function Onda({ color, lado, doble = false }: Props) {
  const posicion = lado === "abajo" ? "-bottom-px" : "-top-[69px]";
  return (
    <div className={`pointer-events-none absolute inset-x-0 ${posicion} h-[70px] overflow-hidden`} aria-hidden="true">
      {doble && (
        <svg
          viewBox="0 0 2880 70"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-[200%] opacity-50 [animation:ola_28s_linear_infinite]"
        >
          <path d={OLA_LENTA} fill={color} />
        </svg>
      )}
      <svg viewBox="0 0 2880 70" preserveAspectRatio="none" className="animar-ola relative h-full w-[200%]">
        <path d={OLA} fill={color} />
      </svg>
    </div>
  );
}
