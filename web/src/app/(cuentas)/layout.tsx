// Diseño común de las pantallas de cuentas: una tarjeta centrada, en una columna desde 360 px.
export default function LayoutCuentas({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-borde bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
