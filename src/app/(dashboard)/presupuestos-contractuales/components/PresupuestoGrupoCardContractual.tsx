'use client';

import { DollarSign, Calendar, FileText, Building2, ChevronDown, ChevronUp, Layers, ListTree, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/modal';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { useState, useMemo } from 'react';
import DetalleVersionModal from '../../presupuestos-licitaciones/components/DetalleVersionModal';
import { useCreateVersionDesdeVersion, useCrearPresupuestoMetaDesdeContractual } from '@/hooks';
import { useConfirm } from '@/context/confirm-context';

interface PresupuestoGrupoCardContractualProps {
  grupoId: string;
  presupuestoPadre: Presupuesto;
  versiones: Presupuesto[];
  nombreProyecto?: string;
}

export default function PresupuestoGrupoCardContractual({
  grupoId,
  presupuestoPadre,
  versiones,
  nombreProyecto,
}: PresupuestoGrupoCardContractualProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [versionSeleccionada, setVersionSeleccionada] = useState<Presupuesto | null>(null);
  const createVersion = useCreateVersionDesdeVersion();
  const crearMeta = useCrearPresupuestoMetaDesdeContractual();
  const { confirm } = useConfirm();

  // Ordenar versiones por número de versión (más reciente primero)
  const versionesOrdenadas = useMemo(() => {
    return [...versiones].sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [versiones]);

  // Calcular totales del grupo
  const totalVersiones = versiones.length;
  const montoPromedio = useMemo(() => {
    if (versiones.length === 0) return 0;
    const suma = versiones.reduce((acc, v) => acc + v.total_presupuesto, 0);
    return suma / versiones.length;
  }, [versiones]);

  const montoMaximo = useMemo(() => {
    if (versiones.length === 0) return 0;
    return Math.max(...versiones.map((v) => v.total_presupuesto));
  }, [versiones]);

  const montoMinimo = useMemo(() => {
    if (versiones.length === 0) return 0;
    return Math.min(...versiones.map((v) => v.total_presupuesto));
  }, [versiones]);

  const handleVerEstructura = (id_presupuesto: string) => {
    // Ruta específica para contractuales
    router.push(`/presupuestos-contractuales/estructura?presupuesto=${id_presupuesto}`);
  };

  const handleVerDetalle = (version: Presupuesto) => {
    setVersionSeleccionada(version);
    setIsDetalleModalOpen(true);
  };

  const handleCrearMeta = (version: Presupuesto) => {
    confirm({
      title: 'Crear Versión Meta',
      message: `¿Desea crear la versión 1 Meta basada en esta versión contractual (V${version.version})?`,
      confirmText: 'Crear V1 Meta',
      cancelText: 'Cancelar',
      onConfirm: () => {
        crearMeta.mutate({
          id_presupuesto_contractual: version.id_presupuesto,
          motivo: undefined
        });
      }
    });
  };

  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg overflow-hidden card-shadow relative">
      {/* Header del Grupo - Siempre visible */}
      <div
        className="p-4 cursor-default hover:bg-[var(--card-bg)]/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Nombre del presupuesto padre + badge de fase */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {presupuestoPadre.nombre_presupuesto}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                presupuestoPadre.fase === 'META'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                {presupuestoPadre.fase === 'META' ? 'META' : 'CONTRACTUAL'}
              </span>
            </div>

            {/* Resumen */}
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <Layers className="h-3 w-3" />
                <span>{totalVersiones} versión{totalVersiones !== 1 ? 'es' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(presupuestoPadre.fecha_creacion).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {totalVersiones > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium text-[var(--text-primary)]">
                    S/ {montoMinimo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - {montoMaximo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botón expandir/colapsar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Versiones - Expandible */}
      {isExpanded && totalVersiones > 0 && (
        <div className="border-t border-[var(--border-color)]/15 bg-[var(--card-bg)]/20">
          <div className="p-2 space-y-1.5">
            {versionesOrdenadas.map((version) => (
              <div
                key={version.id_presupuesto}
                className="px-2 py-1.5 rounded bg-[var(--background)] card-shadow transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {/* Versión compacta - Badge sutil */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      V{version.version || 1}
                    </span>
                    
                    {/* Info con espacios fijos para alineación */}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-[120px]">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {new Date(version.fecha_creacion).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-[140px]">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span className="font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          S/ {version.total_presupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {version.descripcion_version && (
                        <span className="truncate text-[var(--text-secondary)]">{version.descripcion_version}</span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción para contractuales */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Botón Crear V1 Meta - Verde */}
                    <button
                      onClick={() => handleCrearMeta(version)}
                      disabled={crearMeta.isPending}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Crear versión 1 Meta"
                    >
                      <span>{crearMeta.isPending ? 'Creando...' : 'V1 Meta'}</span>
                    </button>
                    
                    {/* Botón Estructura - Azul */}
                    <button
                      onClick={() => handleVerEstructura(version.id_presupuesto)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200"
                      title="Ver estructura del presupuesto"
                    >
                      <ListTree className="w-4 h-4" />
                    </button>
                    
                    {/* Botón Detalle - Naranja */}
                    <button
                      onClick={() => handleVerDetalle(version)}
                      className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm hover:shadow transition-all duration-200"
                      title="Ver detalles del presupuesto"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para ver detalle */}
      <Modal
        isOpen={isDetalleModalOpen}
        onClose={() => {
          setIsDetalleModalOpen(false);
          setVersionSeleccionada(null);
        }}
        title="Detalle de Versión"
        size="lg"
      >
        {versionSeleccionada && (
          <DetalleVersionModal
            version={versionSeleccionada}
            nombreProyecto={nombreProyecto}
          />
        )}
      </Modal>
    </div>
  );
}

