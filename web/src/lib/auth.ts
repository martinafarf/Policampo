// Configuración de Better Auth: autenticación de PoliCampo v2.
// Detalle de cada decisión en docs/especificaciones/01-usuarios-y-autenticacion.md.
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, haveIBeenPwned, username } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { db } from "@/db";
// Reglas del nombre de usuario (especificación 01, sección 6.2): una sola fuente, en el dominio.
import { nombreDeUsuarioValido, USUARIO_MAX, USUARIO_MIN } from "@/dominio/usuarios/validaciones";
import * as schema from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import * as plantillas from "@/lib/email/plantillas";

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

export const auth = betterAuth({
  baseURL: URL_DEL_SITIO,
  secret: secretoDeAutenticacion(),
  trustedOrigins: ORIGENES_CONFIABLES,

  database: drizzleAdapter(db, { provider: "pg", schema }),

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
    onPasswordReset: async ({ user }) => {
      await enviarEmail({ para: user.email, ...plantillas.avisoCambioContrasena() });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true, // al confirmar, se inicia la sesión
    expiresIn: DIA, // el enlace de verificación vence a las 24 horas
    sendVerificationEmail: async ({ user, url }) => {
      await enviarEmail({ para: user.email, ...plantillas.verificacion(url) });
    },
  },

  // Sesión de 30 días, que se renueva una vez por día mientras se usa.
  session: {
    expiresIn: 30 * DIA,
    updateAge: DIA,
  },

  user: {
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
