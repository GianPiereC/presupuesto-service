'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { useProyecto } from '@/hooks/useProyectos';
import { usePresupuestosByProyecto, useCreatePresupuestoPadre } from '@/hooks/usePresupuestos';
import PresupuestoCard from './components/PresupuestoCard';
import ProyectoDetalles from './components/ProyectoDetalles';
import PresupuestoForm from './components/PresupuestoForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProyectoDetallePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const id_proyecto = id;
  const [isPresupuestoModalOpen, setIsPresupuestoModalOpen] = useState(false);
  const createPresupuestoPadre = useCreatePresupuestoPadre();

  // Consultar proyecto
  const { data: proyecto, isLoading: isLoadingProyecto, error: errorProyecto } = useProyecto(id_proyecto);
  
  // Consultar presupuestos del proyecto
  const { data: presupuestos = [], isLoading: isLoadingPresupuestos, error: errorPresupuestos } = usePresupuestosByProyecto(id_proyecto);

  // Filtrar: En Proyectos mostramos todos los presupuestos del proyecto
  // Incluimos padres y versiones para poder detectar versiones ganadoras
  const presupuestosEnProyecto = presupuestos.filter(p => {
    // Incluir padres (necesarios para detectar versiones ganadoras)
    if (p.es_padre && p.version === null) {
      return true;
    }
    
    // Incluir todas las versiones
    const esVersion = p.version !== null && p.version !== undefined;
    
    return esVersion && !p.es_padre;
  });

  // Agrupar presupuestos por id_grupo_version para mostrar versiones
  // Incluimos padres y versiones en el mismo grupo
  const presupuestosAgrupados = presupuestosEnProyecto.reduce((acc, presupuesto) => {
    // Usar id_grupo_version o el id_presupuesto como grupo
    const grupo = presupuesto.id_grupo_version || presupuesto.id_presupuesto || 'sin-grupo';
    
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    
    // Agregar padre o versión al grupo
    acc[grupo].push(presupuesto);
    
    // Ordenar: padre primero (version === null), luego versiones por número
    acc[grupo].sort((a, b) => {
      // Si uno es padre (version === null), va primero
      if (a.version === null && b.version !== null) return -1;
      if (a.version !== null && b.version === null) return 1;
      // Si ambos son versiones, ordenar por número
      return (a.version || 0) - (b.version || 0);
    });
    
    return acc;
  }, {} as Record<string, typeof presupuestosEnProyecto>);

  if (isLoadingProyecto) {
    return (
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (errorProyecto || !proyecto) {
    return (
      <div className="space-y-3">
        <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
          <p className="text-xs text-red-500">
            {errorProyecto ? 'Error al cargar el proyecto' : 'Proyecto no encontrado'}
          </p>
          <button
            onClick={() => router.push('/proyectos')}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
          >
            Volver a Proyectos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/proyectos')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {proyecto.nombre_proyecto}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Detalles del proyecto y sus presupuestos
          </p>
        </div>
      </div>

      {/* Detalles del Proyecto - Compacto */}
      <ProyectoDetalles proyecto={proyecto} />

      {/* Sección de Presupuestos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Presupuestos
          </h2>
          {presupuestosEnProyecto.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)]">
                {presupuestosEnProyecto.filter(p => !p.es_padre).length} presupuesto{presupuestosEnProyecto.filter(p => !p.es_padre).length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setIsPresupuestoModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Agregar Presupuesto
              </button>
            </div>
          )}
        </div>

        {isLoadingPresupuestos ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-[var(--text-secondary)]">Cargando presupuestos...</p>
          </div>
        ) : errorPresupuestos ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-red-500">Error al cargar los presupuestos</p>
          </div>
        ) : presupuestosEnProyecto.filter(p => !p.es_padre).length === 0 ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Este proyecto no tiene presupuestos aún
              </p>
              <button
                onClick={() => setIsPresupuestoModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Agregar Primer Presupuesto
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mostrar presupuestos agrupados por grupo de versión */}
            {Object.entries(presupuestosAgrupados).map(([grupo, presupuestosGrupo]) => (
              <PresupuestoCard
                key={grupo}
                presupuestos={presupuestosGrupo}
                grupo={grupo}
                id_proyecto={id_proyecto}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para Crear Presupuesto */}
      <Modal
        isOpen={isPresupuestoModalOpen}
        onClose={() => setIsPresupuestoModalOpen(false)}
        title="Nuevo Presupuesto"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPresupuestoModalOpen(false)}
              disabled={createPresupuestoPadre.isPending}
              className="px-4 py-2 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="presupuesto-form"
              disabled={createPresupuestoPadre.isPending}
              className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPresupuestoPadre.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        }
      >
        <PresupuestoForm
          id_proyecto={id_proyecto}
          onSubmit={async (data) => {
            try {
              // Crear presupuesto padre con nombre, IGV y utilidad - se crea con fase BORRADOR por defecto
              await createPresupuestoPadre.mutateAsync({
                id_proyecto,
                nombre_presupuesto: data.nombre_presupuesto,
                porcentaje_igv: data.porcentaje_igv || 18,
                porcentaje_utilidad: data.porcentaje_utilidad || 0
              });
              setIsPresupuestoModalOpen(false);
            } catch (error) {
              console.error('Error al crear presupuesto:', error);
            }
          }}
          onCancel={() => setIsPresupuestoModalOpen(false)}
          isLoading={createPresupuestoPadre.isPending}
          cantidadPresupuestos={presupuestos.length}
          modoCrearPadre={true}
        />
      </Modal>
    </div>
  );
}

