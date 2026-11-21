// Rutas de Better Auth (/api/auth/*): registro, ingreso, verificación, recuperación, etc.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
