'use client';

import { use, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePresupuesto } from '@/hooks';
import EstructuraPresupuestoEditor from '@/components/presupuesto/EstructuraPresupuestoEditor';

function EstructuraContent() {
  const searchParams = useSearchParams();
  const id_presupuesto = searchParams.get('presupuesto');

  const { data: presupuesto, isLoading: isLoadingPresupuesto, error: errorPresupuesto } = usePresupuesto(id_presupuesto || null);

  if (isLoadingPresupuesto) {
    return (
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg shadow-lg shadow-black/4 border border-[var(--border-color)] p-12 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Cargando estructura...</p>
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
    
    // Si el presupuesto está aprobado o vigente, modo lectura
    if (presupuesto?.estado === 'aprobado' || presupuesto?.estado === 'vigente') {
      return 'lectura';
    }
    
    // Si el presupuesto está en revisión, modo lectura
    if (presupuesto?.estado === 'en_revision') {
      return 'lectura';
    }
    
    // Si el presupuesto está rechazado, modo lectura
    if (presupuesto?.estado === 'rechazado') {
      return 'lectura';
    }
    
    // Si está en borrador, modo edición
    if (presupuesto?.estado === 'borrador') {
      return 'edicion';
    }
    
    // Por defecto, modo lectura (por seguridad)
    return 'lectura';
  }, [searchParams, presupuesto?.estado, presupuesto?.estado_aprobacion]);

  return (
    <EstructuraPresupuestoEditor
      id_presupuesto={id_presupuesto}
      id_proyecto={presupuesto.id_proyecto}
      nombre_presupuesto={presupuesto.nombre_presupuesto}
      modo={modo}
      rutaRetorno="/presupuestos-meta"
    />
  );
}

export default function EstructuraMetaPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg shadow-lg shadow-black/4 border border-[var(--border-color)] p-12 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Cargando estructura...</p>
        </div>
      </div>
    }>
      <EstructuraContent />
    </Suspense>
  );
}

