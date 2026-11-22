// Configuración de Better Auth: autenticación de PoliCampo v2.
// Detalle de cada decisión en docs/especificaciones/01-usuarios-y-autenticacion.md.
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, haveIBeenPwned, username } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { eq } from "drizzle-orm";
import { db } from "@/db";
// Reglas del nombre de usuario (especificación 01, sección 6.2): una sola fuente, en el dominio.
import { nombreDeUsuarioValido, USUARIO_MAX, USUARIO_MIN } from "@/dominio/usuarios/validaciones";
import * as schema from "@/db/schema";
import { enviarAvisoSinInterrumpir, enviarEmail } from "@/lib/email";
import * as plantillas from "@/lib/email/plantillas";
import { registrarEvento } from "@/lib/eventos";

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// ─── URL del sitio y orígenes confiables (auditoría M-09) ───
// Producción define BETTER_AUTH_URL. En las vistas previas de Vercel se usa la URL exacta del
// despliegue (VERCEL_URL y VERCEL_BRANCH_URL). Nunca se usan comodines como *.vercel.app.
const urlVercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const urlRamaVercel = process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined;
export const URL_DEL_SITIO = process.env.BETTER_AUTH_URL ?? urlVercel ?? "http://localhost:3000";
const ORIGENES_CONFIABLES = [URL_DEL_SITIO, urlVercel, urlRamaVercel].filter(
  (origen): origen is string => Boolean(origen),
);

// ─── Secreto que firma sesiones y tokens (regla RS-01) ───
// En ejecución es obligatorio: sin él, Better Auth usaría un secreto por defecto conocido por
// cualquiera. Solo al compilar (next build, donde nada se firma) se acepta un valor temporal.
function secretoDeAutenticacion(): string {
  const secreto = process.env.BETTER_AUTH_SECRET;
  if (secreto) return secreto;
  if (process.env.NEXT_PHASE === "phase-production-build") return "solo-para-compilar-nunca-firma-nada-real";
  if (process.env.NODE_ENV === "test") return "secreto-de-tests-no-usar-en-otro-lado";
  throw new Error("Falta la variable de entorno BETTER_AUTH_SECRET (ver web/.env.example).");
}

// ─── Roles (regla RS-03) ───
// Solo dos roles. El administrador puede ver usuarios y desactivar/reactivar cuentas (y cerrar sus
// sesiones). NO puede crear usuarios, cambiar roles, borrar cuentas, cambiar contraseñas o emails,
// ni hacerse pasar por otro usuario. Los administradores se crean con el comando crear-admin (T6).
const controlDeAcceso = createAccessControl(defaultStatements);
export const ROLES = {
  usuario: controlDeAcceso.newRole({ user: [], session: [] }),
  administrador: controlDeAcceso.newRole({
    user: ["list", "get", "ban"],
    session: ["list", "revoke"],
  }),
};

// ─── Rutas de Better Auth cerradas al público (especificación 01, T5) ───
// Estas rutas existen en /api/auth/..., pero NO se pueden llamar desde afuera (responden 404).
// Las usan solo nuestras acciones del servidor (src/lib/perfil.ts), que antes validan lo que la
// especificación pide y la librería no: los límites de intentos, escribir ELIMINAR, que el nombre
// de usuario no cambie (CA-01-14), etc. Llamadas como auth.api.xxx() desde el servidor sí funcionan.
// Las de administración (T6) también: desde afuera, un administrador podría desactivar a otro
// administrador o cambiar roles; src/lib/administracion.ts lo impide (auditoría M-08).
const RUTAS_SOLO_DEL_SERVIDOR = [
  "/update-user",
  "/change-password",
  "/change-email",
  "/delete-user",
  "/delete-user/callback",
  "/admin/set-role",
  "/admin/get-user",
  "/admin/create-user",
  "/admin/update-user",
  "/admin/list-users",
  "/admin/list-user-sessions",
  "/admin/ban-user",
  "/admin/unban-user",
  "/admin/impersonate-user",
  "/admin/stop-impersonating",
  "/admin/revoke-user-session",
  "/admin/revoke-user-sessions",
  "/admin/remove-user",
  "/admin/set-user-password",
];

/**
 * Cambio de email (especificación 01, flujo 4.6): cuando la persona abre el enlace que llegó al
 * email NUEVO, Better Auth cambia el email pero no nos dice cuál era el anterior. Ese dato viaja
 * dentro del enlace (un token JWT con { email: anterior, updateTo: nuevo }), y en este punto
 * Better Auth ya comprobó la firma y el vencimiento, así que se puede leer sin volver a verificarlo.
 * Devuelve el email anterior, o null si el pedido no es la confirmación de un cambio de email.
 */
export function emailAnteriorDelEnlace(token: unknown): string | null {
  if (typeof token !== "string") return null;
  try {
    const carga = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as {
      email?: unknown;
      updateTo?: unknown;
      requestType?: unknown;
    };
    if (carga.requestType !== "change-email-verification" || typeof carga.updateTo !== "string") return null;
    return typeof carga.email === "string" ? carga.email : null;
  } catch {
    return null;
  }
}

export const auth = betterAuth({
  baseURL: URL_DEL_SITIO,
  secret: secretoDeAutenticacion(),
  trustedOrigins: ORIGENES_CONFIABLES,
  disabledPaths: RUTAS_SOLO_DEL_SERVIDOR,

  database: drizzleAdapter(db, { provider: "pg", schema }),

  // Después de cambiar el email (al confirmar el enlace), se avisa a la dirección anterior.
  databaseHooks: {
    user: {
      update: {
        after: async (actualizado, contexto) => {
          if (contexto?.path !== "/verify-email") return;
          const anterior = emailAnteriorDelEnlace(contexto.query?.token);
          if (!anterior || anterior === actualizado.email) return;
          await registrarEvento("email_cambiado", { usuarioId: actualizado.id });
          await enviarAvisoSinInterrumpir({ para: anterior, ...plantillas.avisoEmailCambiado() });
        },
      },
    },
  },

  // Registro e ingreso con email y contraseña (regla RS-04).
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // no se ingresa sin confirmar el email
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: HORA, // el enlace de recuperación vence en 1 hora
    revokeSessionsOnPasswordReset: true, // al recuperar la contraseña se cierran todas las sesiones
    sendResetPassword: async ({ user, url }) => {
      await enviarEmail({ para: user.email, ...plantillas.recuperacion(url) });
    },
    // Después de recuperar la contraseña se avisa por email (especificación 01, flujo 4.5).
    // Es un aviso: si el email falla, la contraseña YA se cambió y el enlace ya se usó, así que el
    // error no puede interrumpir la operación (la persona vería "no se cambió" cuando sí se cambió).
    onPasswordReset: async ({ user }) => {
      await enviarAvisoSinInterrumpir({ para: user.email, ...plantillas.avisoCambioContrasena() });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true, // al confirmar, se inicia la sesión
    expiresIn: DIA, // el enlace de verificación vence a las 24 horas
    // Este mismo envío sirve para dos cosas:
    // - al registrarse: la cuenta todavía no está verificada → "Confirmá tu cuenta";
    // - al cambiar el email en el perfil: la cuenta ya está verificada (sin verificar no se puede
    //   ingresar) y user.email es la dirección NUEVA → "Confirmá tu email nuevo".
    sendVerificationEmail: async ({ user, url }) => {
      const contenido = user.emailVerified ? plantillas.confirmarEmailNuevo(url) : plantillas.verificacion(url);
      await enviarEmail({ para: user.email, ...contenido });
    },
  },

  // Sesión de 30 días, que se renueva una vez por día mientras se usa.
  session: {
    expiresIn: 30 * DIA,
    updateAge: DIA,
  },

  user: {
    // Cambio de email desde el perfil: el enlace va al email NUEVO y vence en 24 horas (el mismo
    // vencimiento que la verificación). Hasta confirmarlo, el email sigue siendo el anterior.
    changeEmail: { enabled: true },
    // Eliminar la cuenta desde el perfil (derecho de supresión, Ley 25.326). La contraseña y
    // escribir ELIMINAR los controla src/lib/perfil.ts. Las sesiones, la cuenta y las fincas se
    // borran en cascada en la base; acá se borran además los enlaces pendientes y se avisa.
    deleteUser: {
      enabled: true,
      afterDelete: async (borrado) => {
        await db.delete(schema.verification).where(eq(schema.verification.value, borrado.id));
        await enviarAvisoSinInterrumpir({ para: borrado.email, ...plantillas.cuentaEliminada() });
      },
    },
    additionalFields: {
      // Opcionales; se cargan desde el perfil (T5), no al registrarse.
      nombre: { type: "string", required: false, input: false },
      apellido: { type: "string", required: false, input: false },
      // Consentimiento de la política de privacidad (Ley 25.326, regla RS-17). Lo completa el registro (T3).
      politicaPrivacidadVersion: { type: "string", required: false, input: false },
      politicaPrivacidadAceptadaEn: { type: "date", required: false, input: false },
    },
  },

  // Límites de intentos guardados en la base, no en memoria (regla RS-13, auditoría A-03).
  // Limitan por IP y ruta. El límite por cuenta del ingreso (5 fallidos en 15 minutos) se agrega en la T3.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: MINUTO,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * MINUTO, max: 5 },
      "/sign-in/username": { window: 15 * MINUTO, max: 5 },
      "/sign-up/email": { window: HORA, max: 10 },
      "/request-password-reset": { window: HORA, max: 5 },
      "/send-verification-email": { window: MINUTO, max: 1 },
    },
  },

  advanced: {
    // Cookies Secure cuando el sitio es https (producción y vistas previas).
    useSecureCookies: URL_DEL_SITIO.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },

  plugins: [
    username({
      minUsernameLength: USUARIO_MIN,
      maxUsernameLength: USUARIO_MAX,
      usernameValidator: nombreDeUsuarioValido,
    }),
    admin({
      ac: controlDeAcceso,
      roles: ROLES,
      defaultRole: "usuario",
      adminRoles: ["administrador"],
      allowImpersonatingAdmins: false,
      bannedUserMessage: "Tu cuenta está desactivada. Escribinos para más información.",
    }),
    // Rechaza contraseñas filtradas consultando Have I Been Pwned por k-anonimato.
    // Desactivado en los tests para que no dependan de un servicio externo.
    haveIBeenPwned({
      enabled: process.env.NODE_ENV !== "test",
      customPasswordCompromisedMessage:
        "Esa contraseña apareció en filtraciones de datos. Elegí otra.",
    }),
    nextCookies(), // tiene que ir último: deja que las acciones del servidor guarden cookies
  ],
});

export type Sesion = typeof auth.$Infer.Session;
