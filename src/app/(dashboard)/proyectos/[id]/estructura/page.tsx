'use client';

import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePresupuesto } from '@/hooks';
import EstructuraPresupuestoEditor from '@/components/presupuesto/EstructuraPresupuestoEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

function EstructuraContentWrapper({ id_proyecto }: { id_proyecto: string }) {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg shadow-lg shadow-black/4 border border-[var(--border-color)] p-12 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Cargando estructura...</p>
        </div>
      </div>
    }>
      <EstructuraContent id_proyecto={id_proyecto} />
    </Suspense>
  );
}

function EstructuraContent({ id_proyecto }: { id_proyecto: string }) {
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

  // Determinar el modo según la fase del presupuesto
  // Solo BORRADOR permite edición, todas las demás fases están en modo lectura
  const modo = presupuesto.fase === 'BORRADOR' ? 'edicion' : 'lectura';

  return (
    <EstructuraPresupuestoEditor
      id_presupuesto={id_presupuesto}
      id_proyecto={id_proyecto}
      nombre_presupuesto={presupuesto.nombre_presupuesto}
      modo={modo}
      rutaRetorno={`/proyectos/${id_proyecto}`}
    />
  );
}

export default function EstructuraPresupuestoPage({ params }: PageProps) {
  const { id } = use(params);
  const id_proyecto = id;

  return <EstructuraContentWrapper id_proyecto={id_proyecto} />;
}

