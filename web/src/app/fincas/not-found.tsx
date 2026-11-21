// Pantalla 404 para establecimientos inexistentes o de otros usuarios (RS-02, CA-02-05).
import Link from "next/link";

export default function FincaNoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Error 404</p>
      <h1 className="text-2xl font-bold text-stone-900">No encontramos esta finca</h1>
      <p className="text-sm text-stone-600">
        Puede que haya sido borrada o que el enlace no sea correcto.
      </p>
      <Link
        href="/fincas"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Volver a Mis fincas
      </Link>
    </main>
  );
}
