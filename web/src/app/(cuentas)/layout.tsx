// Diseño común de las pantallas de cuentas (ingresar, registro, recuperar, verificar email).
// Estas pantallas no tienen la barra superior del sitio (EncabezadoSitio no se muestra acá): el logo va
// sobre la foto para volver a la landing, y arriba a la derecha hay un solo botón con "el otro camino".
// En pantallas anchas: foto de la huerta a la izquierda, de alto completo, con borde ondulado, y el
// formulario a la derecha. En el celular: la foto queda como una franja arriba y el formulario abajo.
import Image from "next/image";
import { AccesoAlternativo } from "@/componentes/cuentas/acceso-alternativo";
import { LogoPoliCampo } from "@/componentes/marca/Logo";
import huerta from "../../../public/img/huerta.jpg";

export default function LayoutCuentas({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-svh flex-1 md:grid-cols-2">
      <aside className="relative isolate flex min-h-56 flex-col justify-between overflow-hidden px-5 pt-4 pb-12 md:sticky md:top-0 md:h-svh md:min-h-0 md:px-10 md:py-8">
        <Image src={huerta} alt="" fill placeholder="blur" sizes="(min-width: 768px) 50vw, 100vw" className="-z-20 object-cover" />
        {/* Velo: oscuro arriba (para el logo) y abajo (para la frase), más claro en el medio */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_34_0/.55),rgb(0_34_0/.1)_35%,rgb(0_34_0/.75))]" />
        <LogoPoliCampo sobreFoto />
        <p className="max-w-[22ch] font-titulos text-2xl leading-tight font-bold text-white md:text-4xl">
          Tu finca, con <span className="text-naranja">más flores</span> y más vida.
        </p>
        <BordeOndulado />
      </aside>
      <div className="relative flex flex-col px-4 pt-4 pb-14 md:px-8 md:py-8">
        <div className="flex justify-end">
          <AccesoAlternativo />
        </div>
        <div className="flex flex-1 justify-center pt-6 md:items-center md:pt-0">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </main>
  );
}

/** Borde ondulado entre la foto y el formulario: vertical (de arriba abajo) en pantallas anchas, horizontal en el celular. */
function BordeOndulado() {
  return (
    <>
      <svg
        viewBox="0 0 60 1800"
        preserveAspectRatio="none"
        className="absolute top-0 -right-px hidden h-full w-[60px] md:block"
        aria-hidden="true"
      >
        <path
          d="M60 0 V1800 H30 Q0 1725 30 1650 T30 1500 T30 1350 T30 1200 T30 1050 T30 900 T30 750 T30 600 T30 450 T30 300 T30 150 T30 0Z"
          fill="var(--color-fondo)"
        />
      </svg>
      <svg
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        className="absolute inset-x-0 -bottom-px h-8 w-full md:hidden"
        aria-hidden="true"
      >
        <path d="M0 20 Q180 0 360 20 T720 20 T1080 20 T1440 20 V40 H0Z" fill="var(--color-fondo)" />
      </svg>
    </>
  );
}
