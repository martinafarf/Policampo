// Pantalla 404 para establecimientos inexistentes o de otros usuarios (RS-02, CA-02-05).
import { IconoFinca } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";

export default function FincaNoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <EstadoVacio
        Icono={IconoFinca}
        titulo="No encontramos esta finca"
        texto="Puede que se haya borrado o que el enlace no sea correcto."
        accion={<BotonEnlace href="/fincas">Volver a Mis fincas</BotonEnlace>}
      />
    </main>
  );
}
