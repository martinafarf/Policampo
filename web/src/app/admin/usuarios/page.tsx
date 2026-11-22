// Lista de usuarios (especificación 01, flujo 4.7, T6). Solo administradores: a cualquier otra
// persona le responde 404 (CA-01-19). En el celular la tabla se muestra como tarjetas.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listarUsuarios, type FilaUsuario } from "@/lib/administracion";
import { requerirAdministrador } from "@/lib/sesion";
import { BotonEstado } from "./boton-estado";

export const metadata: Metadata = { title: "Usuarios · PoliCampo" };

type Busqueda = { q?: string; pagina?: string };

const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Jujuy" });

function Etiqueta({ children, tono }: { children: React.ReactNode; tono: "campo" | "error" | "neutro" }) {
  const estilos = { campo: "bg-campo-claro text-campo-oscuro", error: "bg-error-claro text-error", neutro: "bg-fondo text-tinta-suave" }[tono];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${estilos}`}>{children}</span>;
}

function Estado({ fila }: { fila: FilaUsuario }) {
  return (
    <div className="flex flex-wrap gap-1">
      {fila.desactivada ? <Etiqueta tono="error">Desactivada</Etiqueta> : <Etiqueta tono="campo">Activa</Etiqueta>}
      {!fila.verificado && <Etiqueta tono="neutro">Sin verificar</Etiqueta>}
    </div>
  );
}

/** El botón no aparece para la propia cuenta ni para otros administradores (auditoría M-08). */
function Accion({ fila, adminId }: { fila: FilaUsuario; adminId: string }) {
  if (fila.id === adminId) return <span className="text-xs text-tinta-suave">Tu cuenta</span>;
  if (fila.rol === "administrador") return <span className="text-xs text-tinta-suave">Solo desde el servidor</span>;
  return <BotonEstado usuarioId={fila.id} usuario={fila.usuario} desactivada={fila.desactivada} />;
}

function enlacePagina(q: string, pagina: number) {
  const parametros = new URLSearchParams();
  if (q) parametros.set("q", q);
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const texto = parametros.toString();
  return `/admin/usuarios${texto ? `?${texto}` : ""}`;
}

async function Contenido({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const admin = await requerirAdministrador();
  const { q = "", pagina = "1" } = await searchParams;
  const lista = await listarUsuarios({ busqueda: q, pagina: Number(pagina) });

  return (
    <>
      <form action="/admin/usuarios" className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar por usuario o email
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por usuario o email"
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border border-borde bg-white px-3 text-base outline-none focus:ring-2 focus:ring-campo"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-campo px-4 font-semibold text-white hover:bg-campo-oscuro">
          Buscar
        </button>
      </form>

      <p className="mb-3 text-sm text-tinta-suave" aria-live="polite">
        {lista.total === 1 ? "1 usuario" : `${lista.total} usuarios`}
        {q && ` para "${q}"`}
      </p>

      {lista.filas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-white p-5 text-sm">No hay usuarios que coincidan con la búsqueda.</p>
      ) : (
        <>
          {/* Celular: tarjetas */}
          <ul className="flex flex-col gap-3 md:hidden">
            {lista.filas.map((fila) => (
              <li key={fila.id} className="rounded-2xl border border-borde bg-white p-4">
                <p className="font-semibold">
                  {fila.usuario} {fila.rol === "administrador" && <Etiqueta tono="campo">Administrador</Etiqueta>}
                </p>
                <p className="mb-2 text-sm break-all text-tinta-suave">{fila.email}</p>
                <p className="mb-2 text-xs text-tinta-suave">Registro: {fecha.format(fila.registradoEn)}</p>
                <div className="flex items-center justify-between gap-2">
                  <Estado fila={fila} />
                  <Accion fila={fila} adminId={admin.id} />
                </div>
              </li>
            ))}
          </ul>

          {/* Pantallas grandes: tabla */}
          <div className="hidden overflow-hidden rounded-2xl border border-borde bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-campo-claro text-campo-oscuro">
                <tr>
                  <th scope="col" className="px-4 py-3">Usuario</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Registro</th>
                  <th scope="col" className="px-4 py-3">Rol</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.filas.map((fila) => (
                  <tr key={fila.id} className="border-t border-borde align-top">
                    <td className="px-4 py-3 font-medium">{fila.usuario}</td>
                    <td className="px-4 py-3 break-all">{fila.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fecha.format(fila.registradoEn)}</td>
                    <td className="px-4 py-3">{fila.rol === "administrador" ? "Administrador" : "Usuario"}</td>
                    <td className="px-4 py-3">
                      <Estado fila={fila} />
                    </td>
                    <td className="px-4 py-3">
                      <Accion fila={fila} adminId={admin.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {lista.paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-2 text-sm" aria-label="Páginas">
          {lista.pagina > 1 ? (
            <Link href={enlacePagina(q, lista.pagina - 1)} className="flex min-h-11 items-center rounded-lg border border-borde bg-white px-4">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {lista.pagina} de {lista.paginas}
          </span>
          {lista.pagina < lista.paginas ? (
            <Link href={enlacePagina(q, lista.pagina + 1)} className="flex min-h-11 items-center rounded-lg border border-borde bg-white px-4">
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export default function PaginaUsuarios({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-campo-oscuro">Usuarios</h1>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Contenido searchParams={searchParams as Promise<Busqueda>} />
      </Suspense>
    </main>
  );
}
