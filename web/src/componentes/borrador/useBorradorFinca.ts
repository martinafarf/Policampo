"use client";

// Hook de autoguardado de borradores cada 5 segundos en localStorage (Esp. 02, 5.6, CA-02-17, 18).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { claveBorradorLocal, type MetodoCaracterizacion } from "@/dominio/establecimientos";
import {
  eliminarBorrador,
  esBorradorMasNuevo,
  escribirBorrador,
  type BorradorAlmacenado,
} from "./almacenBorrador";

const INTERVALO_AUTOGUARDADO_MS = 5_000;

interface OpcionesBorrador<T> {
  establecimientoId: string;
  metodo: MetodoCaracterizacion;
  actualizadoEnIso: string;
  datosActuales: T;
  onRecuperar: (datos: T) => void;
}

function suscribirAlmacenamiento(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function leerCrudoCliente(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function useBorradorFinca<T>({
  establecimientoId,
  metodo,
  actualizadoEnIso,
  datosActuales,
  onRecuperar,
}: OpcionesBorrador<T>) {
  const clave = claveBorradorLocal(establecimientoId);
  const [decisionTomada, setDecisionTomada] = useState(false);
  const [ultimoAutoguardado, setUltimoAutoguardado] = useState<string | null>(null);

  // Lectura segura de localStorage sin desajustes de hidratación ni setState en useEffect.
  const crudoInicial = useSyncExternalStore(
    suscribirAlmacenamiento,
    () => leerCrudoCliente(clave),
    () => null,
  );

  const borradorPendiente = useMemo<BorradorAlmacenado<T> | null>(() => {
    if (decisionTomada || !crudoInicial) return null;
    try {
      const parseado = JSON.parse(crudoInicial) as Partial<BorradorAlmacenado<T>>;
      if (
        !parseado ||
        parseado.metodo !== metodo ||
        typeof parseado.guardadoEn !== "string" ||
        parseado.datos === undefined
      ) {
        return null;
      }
      if (!esBorradorMasNuevo(parseado.guardadoEn, actualizadoEnIso)) {
        return null;
      }
      return {
        metodo: parseado.metodo,
        guardadoEn: parseado.guardadoEn,
        datos: parseado.datos,
      };
    } catch {
      return null;
    }
  }, [decisionTomada, crudoInicial, metodo, actualizadoEnIso]);

  const serializadoActual = JSON.stringify(datosActuales);
  const ultimoSerializadoGuardadoRef = useRef<string>(serializadoActual);
  const datosActualesRef = useRef<T>(datosActuales);
  const serializadoActualRef = useRef<string>(serializadoActual);
  const tieneBorradorPendienteRef = useRef<boolean>(borradorPendiente !== null);

  useEffect(() => {
    datosActualesRef.current = datosActuales;
    serializadoActualRef.current = serializadoActual;
  }, [datosActuales, serializadoActual]);

  useEffect(() => {
    tieneBorradorPendienteRef.current = borradorPendiente !== null;
  }, [borradorPendiente]);

  // Autoguardar cada 5 segundos si hubo cambios y no estamos esperando decisión sobre un borrador previo.
  useEffect(() => {
    const temporizador = window.setInterval(() => {
      if (tieneBorradorPendienteRef.current) return;
      if (serializadoActualRef.current === ultimoSerializadoGuardadoRef.current) return;

      const guardado = escribirBorrador(
        window.localStorage,
        establecimientoId,
        metodo,
        datosActualesRef.current,
      );
      if (guardado) {
        ultimoSerializadoGuardadoRef.current = serializadoActualRef.current;
        setUltimoAutoguardado(guardado.guardadoEn);
        // El borrador que acabamos de escribir es de ESTA sesión, no uno que quedó de antes. Sin esto, la
        // lectura de localStorage lo veía como "borrador pendiente" y el aviso "tenés cambios sin guardar"
        // aparecía a los 5 segundos de tocar cualquier cosa. El aviso es solo para cuando se vuelve a la
        // pantalla después de haberla dejado sin guardar.
        setDecisionTomada(true);
      }
    }, INTERVALO_AUTOGUARDADO_MS);

    return () => window.clearInterval(temporizador);
  }, [establecimientoId, metodo]);

  const recuperarBorrador = useCallback(() => {
    if (!borradorPendiente) return;
    onRecuperar(borradorPendiente.datos);
    ultimoSerializadoGuardadoRef.current = JSON.stringify(borradorPendiente.datos);
    setUltimoAutoguardado(borradorPendiente.guardadoEn);
    setDecisionTomada(true);
  }, [borradorPendiente, onRecuperar]);

  const descartarBorrador = useCallback(() => {
    eliminarBorrador(window.localStorage, establecimientoId);
    setDecisionTomada(true);
  }, [establecimientoId]);

  const guardarBorradorAhora = useCallback(() => {
    const guardado = escribirBorrador(
      window.localStorage,
      establecimientoId,
      metodo,
      datosActualesRef.current,
    );
    if (guardado) {
      ultimoSerializadoGuardadoRef.current = serializadoActualRef.current;
      setUltimoAutoguardado(guardado.guardadoEn);
      setDecisionTomada(true);
    }
  }, [establecimientoId, metodo]);

  const limpiarBorrador = useCallback(() => {
    eliminarBorrador(window.localStorage, establecimientoId);
    ultimoSerializadoGuardadoRef.current = serializadoActualRef.current;
    setUltimoAutoguardado(null);
    setDecisionTomada(true);
  }, [establecimientoId]);

  return {
    borradorPendiente,
    ultimoAutoguardado,
    recuperarBorrador,
    descartarBorrador,
    guardarBorradorAhora,
    limpiarBorrador,
  };
}
