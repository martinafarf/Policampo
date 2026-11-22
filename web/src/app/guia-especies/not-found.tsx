// 404 para especies inexistentes o no publicadas en la Guía de especies (RS-02).
import Link from "next/link";

export default function EspecieNoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Error 404</p>
      <h1 className="text-2xl font-bold text-stone-900">No encontramos esa especie</h1>
      <p className="text-sm text-stone-600">
        Puede que todavía no esté publicada en la Guía de especies.
      </p>
      <Link
        href="/guia-especies"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Volver a la Guía de especies
      </Link>
    </main>
  );
}
