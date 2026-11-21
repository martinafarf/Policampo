// Página provisoria de la v2. Las pantallas reales se construyen a partir de las especificaciones.
export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-green-800">PoliCampo</h1>
      <p className="max-w-md text-zinc-700">
        Sistema de apoyo a la toma de decisiones agroecológicas para fincas de Jujuy.
      </p>
      <p className="text-sm text-zinc-500">Versión 2 en construcción.</p>
    </main>
  );
}
