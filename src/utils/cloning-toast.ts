'use client';

import React from 'react';
import toast from 'react-hot-toast';
import CloningToastContent from '@/components/ui/cloning-toast-content';

/**
 * Muestra un toast de clonación con animación Lottie que no se cierra automáticamente
 * @returns El ID del toast para poder cerrarlo después
 */
export function showCloningToast(): string {
  return toast.custom(
    (t) => React.createElement(CloningToastContent, { t }),
    {
      duration: Infinity, // No se cierra automáticamente
      position: 'top-right',
    }
  );
}

/**
 * Cierra el toast de clonación
 * @param toastId ID del toast a cerrar
 */
export function dismissCloningToast(toastId: string): void {
  toast.dismiss(toastId);
}

