'use client';

import { DollarSign, Calendar, FileText, Tag, Eye, Copy, Building2, ChevronDown, ChevronUp, Layers, ListTree, ArrowRightCircle, PencilIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/modal';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { useState, useMemo } from 'react';
import CrearVersionForm from './CrearVersionForm';
import PasarAContractualForm from './PasarAContractualForm';
import DetalleVersionModal from './DetalleVersionModal';
import { useCreateVersionDesdeVersion, usePasarAContractual, useEliminarGrupoPresupuestoCompleto } from '@/hooks';
import { useConfirm } from '@/context/confirm-context';

interface PresupuestoGrupoCardProps {
  grupoId: string;
  presupuestoPadre: Presupuesto;
  versiones: Presupuesto[];
  nombreProyecto?: string;
}

export default function PresupuestoGrupoCard({
  grupoId,
  presupuestoPadre,
  versiones,
  nombreProyecto,
}: PresupuestoGrupoCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContractualModalOpen, setIsContractualModalOpen] = useState(false);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [versionSeleccionada, setVersionSeleccionada] = useState<Presupuesto | null>(null);
  const createVersion = useCreateVersionDesdeVersion();
  const pasarAContractual = usePasarAContractual();
  const eliminarGrupoCompleto = useEliminarGrupoPresupuestoCompleto();
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
    // Si está en revisión, pasar modo lectura
    const modo = estaEnRevision ? 'lectura' : 'edicion';
    router.push(`/presupuestos-licitaciones/estructura?presupuesto=${id_presupuesto}&modo=${modo}`);
  };

  const handleVerDetalle = (version: Presupuesto) => {
    setVersionSeleccionada(version);
    setIsDetalleModalOpen(true);
  };

  const handleCrearVersion = () => {
    setIsModalOpen(true);
  };

  const handleConfirmarCrearVersion = async (id_presupuesto_base: string, descripcion_version?: string) => {
    try {
      await createVersion.mutateAsync({
        id_presupuesto_base,
        descripcion_version,
      });
      setIsModalOpen(false);
    } catch (error) {
      // El error ya se maneja en el hook
      console.error('Error al crear versión:', error);
    }
  };

  const handlePasarAContractual = (version: Presupuesto) => {
    setVersionSeleccionada(version);
    setIsContractualModalOpen(true);
  };

  const handleConfirmarPasarAContractual = async (motivo: string) => {
    if (!versionSeleccionada) return;

    try {
      await pasarAContractual.mutateAsync({
        id_presupuesto_licitacion: versionSeleccionada.id_presupuesto,
        motivo,
      });
      setIsContractualModalOpen(false);
      setVersionSeleccionada(null);
    } catch (error) {
      // El error ya se maneja en el hook
      console.error('Error al pasar a contractual:', error);
    }
  };

  const handleBorrarGrupoCompleto = () => {
    confirm({
      title: '¿Eliminar versión borrador?',
      message: `Se eliminará permanentemente:\n• La versión borrador "${presupuestoPadre.nombre_presupuesto}"\n• Todos sus títulos y partidas\n• Todos los recursos y análisis de precios\n• Los precios compartidos asociados\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await eliminarGrupoCompleto.mutateAsync(grupoId);
        } catch (error) {
          console.error('Error al borrar el grupo completo:', error);
        }
      }
    });
  };

  // Verificar si el presupuesto está en revisión (pendiente de aprobación)
  const estaEnRevision = useMemo(() => {
    return presupuestoPadre.estado === 'en_revision' || 
      (presupuestoPadre.estado_aprobacion?.estado === 'PENDIENTE' && 
       presupuestoPadre.estado_aprobacion?.tipo === 'LICITACION_A_CONTRACTUAL');
  }, [presupuestoPadre.estado, presupuestoPadre.estado_aprobacion]);

  // Determinar qué versión fue enviada para aprobación
  const versionEnviada = useMemo(() => {
    if (!estaEnRevision) return null;
    // Buscar la versión que coincide con version_licitacion_aprobada o id_presupuesto_licitacion
    return versiones.find(v => 
      presupuestoPadre.version_licitacion_aprobada === v.version ||
      presupuestoPadre.id_presupuesto_licitacion === v.id_presupuesto
    ) || null;
  }, [estaEnRevision, presupuestoPadre.version_licitacion_aprobada, presupuestoPadre.id_presupuesto_licitacion, versiones]);

  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg overflow-hidden card-shadow relative">
      {/* Header del Grupo - Siempre visible */}
      <div
        className="p-4 cursor-default hover:bg-[var(--card-bg)]/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Nombre del presupuesto padre + proyecto en una sola línea */}
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {presupuestoPadre.nombre_presupuesto}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 flex-shrink-0">
                  LICITACIÓN
                </span>
              </div>
              {/* Etiqueta de estado de revisión al final de la línea */}
              {estaEnRevision && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 flex-shrink-0">
                  En estado de revisión
                </span>
              )}
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

          {/* Botones de acción del grupo */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Ocultar botón "Nueva Versión" si está en revisión */}
            {!estaEnRevision && (
              <button
                onClick={handleCrearVersion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200"
                title="Crear nueva versión"
              >
                <Copy className="h-4 w-4" />
                Nueva Versión
              </button>
            )}
            {presupuestoPadre.fase === 'BORRADOR' && (
              <button
                onClick={handleBorrarGrupoCompleto}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm hover:shadow transition-all duration-200"
                title="Eliminar todo el flujo del presupuesto (solo en estado Borrador)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
        <div className="border-t border-[var(--border-color)]/30 bg-[var(--card-bg)]/20">
          <div className="p-2 space-y-1.5">
            {versionesOrdenadas.map((version) => {
              // Verificar si esta versión fue enviada para aprobación
              const esVersionEnviada = versionEnviada?.id_presupuesto === version.id_presupuesto;

              return (
                <div
                  key={version.id_presupuesto}
                  className="px-2 py-1.5 rounded bg-[var(--background)] card-shadow transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {/* Versión compacta - Badge sutil */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 flex-shrink-0">
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

                  {/* Botones de acción estilo Velimaq */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Etiqueta "Elegida para aprobar" - al lado de los botones */}
                    {esVersionEnviada && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 whitespace-nowrap">
                        ✓ Elegida para aprobar
                      </span>
                    )}
                    
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
                    
                    {/* Botón Pasar a Contractual - Verde (oculto si está en revisión) */}
                    {!estaEnRevision && (
                      <button
                        onClick={() => handlePasarAContractual(version)}
                        className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm hover:shadow transition-all duration-200"
                        title="Pasar esta versión a fase contractual"
                      >
                        <ArrowRightCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Modal para crear versión */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Crear Nueva Versión - ${presupuestoPadre.nombre_presupuesto}`}
        size="md"
      >
        <CrearVersionForm
          versiones={versionesOrdenadas}
          onConfirm={handleConfirmarCrearVersion}
          onCancel={() => setIsModalOpen(false)}
          isLoading={createVersion.isPending}
        />
      </Modal>

      {/* Modal para pasar a contractual */}
      <Modal
        isOpen={isContractualModalOpen}
        onClose={() => {
          setIsContractualModalOpen(false);
          setVersionSeleccionada(null);
        }}
        title="Pasar a Fase Contractual"
        size="md"
      >
        {versionSeleccionada && (
          <PasarAContractualForm
            versionNumero={versionSeleccionada.version || 1}
            nombrePresupuesto={presupuestoPadre.nombre_presupuesto}
            onConfirm={handleConfirmarPasarAContractual}
            onCancel={() => {
              setIsContractualModalOpen(false);
              setVersionSeleccionada(null);
            }}
            isLoading={pasarAContractual.isPending}
          />
        )}
      </Modal>

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

