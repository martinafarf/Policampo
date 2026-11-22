// Comando para crear o ascender un administrador (especificación 01, flujo 4.7, regla RS-03).
//
//   npm run crear-admin -- --email ana@ejemplo.com
//
// - Si la cuenta existe, la pasa a Administrador.
// - Si no existe, pide el nombre de usuario y la contraseña (sin mostrarla) y la crea verificada.
//
// Usa la base del DATABASE_URL de web/.env.local (la rama "desarrollo"). Para producción se corre
// con DATABASE_URL apuntando a "production" solo en esa terminal; nunca se guarda en el repo.
import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline";

loadEnvConfig(process.cwd());

// Un solo lector de consola para todas las preguntas. Las líneas se guardan en una cola: así funciona
// tanto escribiendo en la terminal como pasando las respuestas por una tubería (por ejemplo en scripts).
const esTerminal = Boolean(process.stdin.isTTY);
const consola = createInterface({ input: process.stdin, output: process.stdout, terminal: esTerminal });
const lineas: string[] = [];
const esperando: ((linea: string) => void)[] = [];
consola.on("line", (linea) => (esperando.length ? esperando.shift()!(linea) : lineas.push(linea)));
consola.on("close", () => esperando.splice(0).forEach((resolver) => resolver("")));

// En la terminal, readline escribe cada tecla en pantalla: mientras se pide la contraseña, se calla.
let ocultar = false;
type ConSalida = { _writeToOutput: (s: string) => void };
const escribirOriginal = (consola as unknown as ConSalida)._writeToOutput;
(consola as unknown as ConSalida)._writeToOutput = (s: string) => {
  if (!ocultar) escribirOriginal.call(consola, s);
};

/** Pregunta por consola. Con `oculta`, no se ve lo que se escribe (para la contraseña). */
async function preguntar(texto: string, oculta = false): Promise<string> {
  process.stdout.write(texto);
  ocultar = oculta && esTerminal;
  const respuesta = lineas.length ? lineas.shift()! : await new Promise<string>((r) => esperando.push(r));
  if (ocultar || !esTerminal) process.stdout.write("\n");
  ocultar = false;
  return respuesta;
}

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = argumento("email");
  if (!email) {
    console.error("Uso: npm run crear-admin -- --email <email>");
    process.exit(1);
  }
  // Se importa después de cargar el .env.local, porque la conexión a la base lo necesita.
  const { crearOAscenderAdministrador, existeCuenta } = await import("@/lib/administracion");

  let usuario: string | undefined;
  let contrasena: string | undefined;
  if (!(await existeCuenta(email))) {
    console.log("No hay una cuenta con ese email: se va a crear una nueva, ya verificada.");
    usuario = await preguntar("Nombre de usuario: ");
    contrasena = await preguntar("Contraseña (no se muestra): ", true);
    if ((await preguntar("Repetí la contraseña: ", true)) !== contrasena) {
      console.error("Las contraseñas no coinciden.");
      process.exit(1);
    }
  }

  const resultado = await crearOAscenderAdministrador({ email, usuario, contrasena });
  if (!resultado.ok) {
    console.error(`No se pudo: ${resultado.error}`);
    process.exit(1);
  }
  const mensajes = {
    creado: "Listo: se creó la cuenta de administrador.",
    ascendido: "Listo: la cuenta ahora es de administrador.",
    ya_era: "Esa cuenta ya era de administrador.",
  };
  console.log(mensajes[resultado.accion]);
  process.exit(0);
}

main().catch((error) => {
  console.error("Error inesperado:", error instanceof Error ? error.message : error);
  process.exit(1);
});
