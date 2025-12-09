'use client';

import { DollarSign, Calendar, CheckCircle2, XCircle, ArrowRight, ListTree } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAprobarPresupuesto, useRechazarPresupuesto } from '@/hooks/useAprobaciones';
import { useConfirm } from '@/context/confirm-context';
import Modal from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showCloningToast, dismissCloningToast } from '@/utils/cloning-toast';

interface PresupuestoGrupoCardAprobacionProps {
  id_aprobacion: string;
  grupoId: string;
  presupuestoPadre: {
    id_presupuesto: string;
    nombre_presupuesto: string;
    fecha_creacion: string;
    total_presupuesto: number;
  };
  versiones: Array<{
    id_presupuesto: string;
    nombre_presupuesto: string;
    version: number;
    fecha_creacion: string;
    total_presupuesto: number;
    descripcion_version?: string;
  }>;
  tipoAprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META';
}

export default function PresupuestoGrupoCardAprobacion({
  id_aprobacion,
  grupoId,
  presupuestoPadre,
  versiones,
  tipoAprobacion,
}: PresupuestoGrupoCardAprobacionProps) {
  const router = useRouter();
  const aprobarMutation = useAprobarPresupuesto();
  const rechazarMutation = useRechazarPresupuesto();
  const { confirm } = useConfirm();
  
  // Estados para el modal de rechazo
  const [isRechazarModalOpen, setIsRechazarModalOpen] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');

  // Ordenar versiones por número de versión (más reciente primero)
  const versionesOrdenadas = useMemo(() => {
    return [...versiones].sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [versiones]);

  const handleAprobar = () => {
    confirm({
      title: 'Aprobar Presupuesto',
      message: `¿Está seguro de que desea aprobar este presupuesto?`,
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        // Solo para LICITACION_A_CONTRACTUAL mostramos el toast de clonado
        let cloningToastId: string | undefined;
        
        if (tipoAprobacion === 'LICITACION_A_CONTRACTUAL') {
          cloningToastId = showCloningToast();
          // Pequeño delay para asegurar que el toast se renderice
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
          await aprobarMutation.mutateAsync({
            id_aprobacion,
            comentario: undefined,
          });
          
          // Cerrar el toast de clonado si existe
          if (cloningToastId) {
            dismissCloningToast(cloningToastId);
          }
        } catch (error) {
          // Cerrar el toast de clonado si hay error
          if (cloningToastId) {
            dismissCloningToast(cloningToastId);
          }
          // El error ya se maneja en onError del hook
        }
      },
    });
  };

  const handleRechazar = () => {
    setComentarioRechazo('');
    setIsRechazarModalOpen(true);
  };

  const handleVerEstructura = (id_presupuesto: string) => {
    // En aprobación, siempre modo lectura
    router.push(`/presupuestos-aprobacion/estructura?presupuesto=${id_presupuesto}&modo=lectura`);
  };

  const handleConfirmarRechazar = () => {
    if (!comentarioRechazo.trim()) {
      return; // No hacer nada si no hay comentario
    }

    rechazarMutation.mutate(
      {
        id_aprobacion,
        comentario: comentarioRechazo.trim(),
      },
      {
        onSuccess: () => {
          setIsRechazarModalOpen(false);
          setComentarioRechazo('');
        },
      }
    );
  };

  const totalVersiones = versiones.length;

  const getTipoAprobacionInfo = () => {
    if (tipoAprobacion === 'LICITACION_A_CONTRACTUAL') {
      return {
        from: 'Licitación',
        to: 'Contractual',
      };
    } else if (tipoAprobacion === 'CONTRACTUAL_A_META') {
      return {
        from: 'Contractual',
        to: 'Meta',
      };
    } else if (tipoAprobacion === 'NUEVA_VERSION_META') {
      return {
        from: 'Meta Borrador',
        to: 'Aprobado',
      };
    } else {
      return {
        from: 'Meta Aprobado',
        to: 'Vigente',
      };
    }
  };

  const getTipoAprobacionColor = () => {
    if (tipoAprobacion === 'LICITACION_A_CONTRACTUAL') {
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    } else if (tipoAprobacion === 'CONTRACTUAL_A_META') {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    } else if (tipoAprobacion === 'OFICIALIZAR_META') {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    } else {
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg overflow-hidden card-shadow relative">
      {/* Header del Grupo - Solo nombre y badge */}
      <div className="p-3 border-b border-[var(--border-color)]/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate flex-1">
            {presupuestoPadre.nombre_presupuesto}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getTipoAprobacionColor()} flex-shrink-0 flex items-center gap-1`}>
            <span>{getTipoAprobacionInfo().from}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{getTipoAprobacionInfo().to}</span>
          </span>
        </div>
      </div>

      {/* Versiones - Siempre visible */}
      {totalVersiones > 0 && (
        <div className="border-t border-[var(--border-color)]/30 bg-[var(--card-bg)]/20">
          <div className="p-2 space-y-1.5">
            {versionesOrdenadas.map((version) => (
              <div
                key={version.id_presupuesto}
                className="px-2 py-1.5 rounded bg-[var(--background)] card-shadow transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {/* Versión compacta - Badge sutil - Usa el color según el tipo de aprobación */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                      tipoAprobacion === 'LICITACION_A_CONTRACTUAL'
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : tipoAprobacion === 'CONTRACTUAL_A_META'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : tipoAprobacion === 'OFICIALIZAR_META'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400'
                    }`}>
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
                          S/ {(version.total_presupuesto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {version.descripcion_version && (
                        <span className="truncate text-[var(--text-secondary)]">{version.descripcion_version}</span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción de aprobación con texto */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Botón Estructura - Azul */}
                    <button
                      onClick={() => handleVerEstructura(version.id_presupuesto)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200"
                      title="Ver estructura del presupuesto"
                    >
                      <ListTree className="w-4 h-4" />
                    </button>
                    
                    {/* Botón Aprobar - Verde */}
                    <button
                      onClick={handleAprobar}
                      disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{aprobarMutation.isPending ? 'Aprobando...' : 'Aprobar'}</span>
                    </button>
                    
                    {/* Botón Rechazar - Rojo */}
                    <button
                      onClick={handleRechazar}
                      disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{rechazarMutation.isPending ? 'Rechazando...' : 'Rechazar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para rechazar */}
      <Modal
        isOpen={isRechazarModalOpen}
        onClose={() => {
          setIsRechazarModalOpen(false);
          setComentarioRechazo('');
        }}
        title="Rechazar Presupuesto"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              ¿Está seguro de que desea rechazar este presupuesto?
            </p>
            {versionesOrdenadas.length > 0 && versionesOrdenadas[0] && (
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Versión: <strong>V{versionesOrdenadas[0].version || ''}</strong>
                {' • '}
                Monto: <strong>S/ {(versionesOrdenadas[0].total_presupuesto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Motivo del rechazo <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={comentarioRechazo}
              onChange={(e) => setComentarioRechazo(e.target.value)}
              placeholder="Ingrese el motivo del rechazo (obligatorio)..."
              rows={4}
              className="w-full"
            />
            {!comentarioRechazo.trim() && (
              <p className="text-xs text-red-500 mt-1">El motivo del rechazo es obligatorio</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRechazarModalOpen(false);
                setComentarioRechazo('');
              }}
              disabled={rechazarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarRechazar}
              disabled={rechazarMutation.isPending || !comentarioRechazo.trim()}
            >
              {rechazarMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


