'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface PrecioSyncContextType {
  precios: Map<string, number>; // recurso_id -> precio
  actualizarPrecio: (recurso_id: string, precio: number, origen?: string) => void;
  obtenerPrecio: (recurso_id: string) => number | undefined;
  suscribirse: (recurso_id: string, callback: (precio: number) => void) => () => void;
}

const PrecioSyncContext = createContext<PrecioSyncContextType | undefined>(undefined);

// Map para almacenar suscriptores por recurso_id
const suscriptores = new Map<string, Set<(precio: number) => void>>();

export function PrecioSyncProvider({ children }: { children: React.ReactNode }) {
  const [precios, setPrecios] = useState<Map<string, number>>(new Map());
  const suscriptoresRef = useRef<Map<string, Set<(precio: number) => void>>>(suscriptores);

  const actualizarPrecio = useCallback((recurso_id: string, precio: number, origen?: string) => {
    if (!recurso_id || precio < 0) return;

    setPrecios((prev) => {
      const nuevo = new Map(prev);
      const precioAnterior = nuevo.get(recurso_id);

      // Solo actualizar si el precio cambió (evitar loops infinitos)
      if (precioAnterior === undefined || Math.abs(precioAnterior - precio) > 0.001) {
        nuevo.set(recurso_id, precio);

        // Notificar a todos los suscriptores de este recurso_id de forma asíncrona
        // usando queueMicrotask en lugar de setTimeout para mejor rendimiento
        const callbacks = suscriptoresRef.current.get(recurso_id);
        if (callbacks) {
          queueMicrotask(() => {
            callbacks.forEach((callback) => {
              try {
                callback(precio);
              } catch (error) {
                console.error(`Error en callback de precio para ${recurso_id}:`, error);
              }
            });
          });
        }
      }

      return nuevo;
    });
  }, []);

  const obtenerPrecio = useCallback((recurso_id: string): number | undefined => {
    return precios.get(recurso_id);
  }, [precios]);

  const suscribirse = useCallback((recurso_id: string, callback: (precio: number) => void) => {
    if (!suscriptoresRef.current.has(recurso_id)) {
      suscriptoresRef.current.set(recurso_id, new Set());
    }

    suscriptoresRef.current.get(recurso_id)!.add(callback);

    // Retornar función de desuscripción
    return () => {
      const callbacks = suscriptoresRef.current.get(recurso_id);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          suscriptoresRef.current.delete(recurso_id);
        }
      }
    };
  }, []);

  const value: PrecioSyncContextType = {
    precios,
    actualizarPrecio,
    obtenerPrecio,
    suscribirse,
  };

  return (
    <PrecioSyncContext.Provider value={value}>
      {children}
    </PrecioSyncContext.Provider>
  );
}

export function usePrecioSync() {
  const context = useContext(PrecioSyncContext);
  if (context === undefined) {
    throw new Error('usePrecioSync debe usarse dentro de PrecioSyncProvider');
  }
  return context;
}
