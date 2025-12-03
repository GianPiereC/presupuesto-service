'use client';

import { use, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui';
import { usePresupuesto } from '@/hooks';
import EstructuraPresupuestoEditor from '@/components/presupuesto/EstructuraPresupuestoEditor';

function EstructuraContent() {
  const searchParams = useSearchParams();
  const id_presupuesto = searchParams.get('presupuesto');

  const { data: presupuesto, isLoading: isLoadingPresupuesto, error: errorPresupuesto } = usePresupuesto(id_presupuesto || null);

  if (isLoadingPresupuesto) {
    return (
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg shadow-lg shadow-black/4 border border-[var(--border-color)] p-12">
          <LoadingSpinner size={80} showText={true} text="Cargando estructura..." />
        </div>
      </div>
    );
  }

  if (!id_presupuesto) {
    return (
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg border border-[var(--border-color)] p-4 text-center">
        <p className="text-xs text-red-500">No se especificó el presupuesto</p>
      </div>
    );
  }

  if (errorPresupuesto || !presupuesto) {
    return (
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg border border-[var(--border-color)] p-4 text-center">
        <p className="text-xs text-red-500">Error al cargar el presupuesto</p>
      </div>
    );
  }

  // Determinar el modo según el estado del presupuesto
  const modo = useMemo(() => {
    // Si viene un modo en los query params, usarlo
    const modoParam = searchParams.get('modo');
    if (modoParam === 'lectura' || modoParam === 'edicion') {
      return modoParam;
    }
    
    // Si el presupuesto está en revisión, forzar modo lectura
    if (presupuesto?.estado === 'en_revision' || 
        (presupuesto?.estado_aprobacion?.estado === 'PENDIENTE' && 
         presupuesto?.estado_aprobacion?.tipo === 'LICITACION_A_CONTRACTUAL')) {
      return 'lectura';
    }
    
    // Por defecto, modo edición
    return 'edicion';
  }, [searchParams, presupuesto?.estado, presupuesto?.estado_aprobacion]);

  return (
    <EstructuraPresupuestoEditor
      id_presupuesto={id_presupuesto}
      id_proyecto={presupuesto.id_proyecto}
      nombre_presupuesto={presupuesto.nombre_presupuesto}
      modo={modo}
      rutaRetorno="/presupuestos-licitaciones"
    />
  );
}

export default function EstructuraLicitacionesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg shadow-lg shadow-black/4 border border-[var(--border-color)] p-12">
          <LoadingSpinner size={80} showText={true} text="Cargando estructura..." />
        </div>
      </div>
    }>
      <EstructuraContent />
    </Suspense>
  );
}

