'use client';

import { DollarSign, Calendar, FileText, Tag, Eye, Clock, Send, ChevronDown, ChevronUp, Settings, Trash2, ListTree } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import PresupuestoForm from './PresupuestoForm';
import { useCreateVersionDesdePadre, useEnviarALicitacion, useUpdatePresupuestoPadre, useEliminarGrupoPresupuestoCompleto } from '@/hooks/usePresupuestos';
import { useConfirm } from '@/context/confirm-context';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { useState, useMemo } from 'react';

interface PresupuestoCardProps {
  presupuestos: Presupuesto[];
  grupo: string;
  id_proyecto: string;
}

type FasePresupuesto = 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';

export default function PresupuestoCard({ presupuestos, grupo, id_proyecto }: PresupuestoCardProps) {
  const router = useRouter();
  const createVersion = useCreateVersionDesdePadre();
  const enviarALicitacion = useEnviarALicitacion();
  const updatePresupuestoPadre = useUpdatePresupuestoPadre();
  const eliminarGrupoCompleto = useEliminarGrupoPresupuestoCompleto();
  const { confirm } = useConfirm();
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isEnviando, setIsEnviando] = useState(false);
  const [isEditPadreModalOpen, setIsEditPadreModalOpen] = useState(false);
  
  // Estados para controlar qué fases están expandidas
  const [fasesExpandidas, setFasesExpandidas] = useState<Set<FasePresupuesto>>(new Set());
  
  // Filtrar solo versiones (no padres) y obtener el padre
  const versiones = presupuestos.filter(p => p.version !== null && !p.es_padre);
  const padre = presupuestos.find(p => p.es_padre && p.version === null);
  
  // Agrupar versiones por fase
  const versionesPorFase = useMemo(() => {
    const agrupadas: Record<FasePresupuesto, Presupuesto[]> = {
      BORRADOR: [],
      LICITACION: [],
      CONTRACTUAL: [],
      META: []
    };
    
    versiones.forEach(v => {
      const fase = (v.fase || 'BORRADOR') as FasePresupuesto;
      
      // Para fase META, aplicar el mismo filtro que en PresupuestoGrupoCardMeta (tab aprobadas)
      if (fase === 'META') {
        // Incluir versiones aprobadas o vigentes
        if (v.estado === 'aprobado' || v.estado === 'vigente') {
          agrupadas[fase].push(v);
        }
        // Incluir versiones en revisión para oficialización (mantener visible como en tab aprobadas)
        else if (v.estado === 'en_revision' && v.estado_aprobacion?.tipo === 'OFICIALIZAR_META') {
          agrupadas[fase].push(v);
        }
        // No incluir otros estados (borrador, rechazado, en_revision sin OFICIALIZAR_META, null)
      } else {
        // Para otras fases, incluir todas las versiones
        if (agrupadas[fase]) {
          agrupadas[fase].push(v);
        }
      }
    });
    
    // Ordenar versiones dentro de cada fase (más reciente primero)
    Object.keys(agrupadas).forEach(fase => {
      agrupadas[fase as FasePresupuesto].sort((a, b) => (b.version || 0) - (a.version || 0));
    });
    
    return agrupadas;
  }, [versiones]);
  
  // Determinar la fase actual (la más reciente que tenga versiones)
  const faseActual = useMemo(() => {
    const ordenFases: FasePresupuesto[] = ['META', 'CONTRACTUAL', 'LICITACION', 'BORRADOR'];
    for (const fase of ordenFases) {
      if (versionesPorFase[fase].length > 0) {
        return fase;
      }
    }
    return 'BORRADOR' as FasePresupuesto;
  }, [versionesPorFase]);
  
  // El presupuesto principal es el más reciente de la fase actual
  const presupuestoPrincipal = versionesPorFase[faseActual][0] || presupuestos[0];
  
  // Verificar si hay versiones
  const tieneVersiones = versiones.length > 0;
  
  const faseColors = {
    BORRADOR: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    LICITACION: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    CONTRACTUAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    META: 'bg-green-500/10 text-green-600 dark:text-green-400',
  };
  
  const faseLabels = {
    BORRADOR: 'Borrador',
    LICITACION: 'Licitación',
    CONTRACTUAL: 'Contractual',
    META: 'Meta',
  };
  
  const ordenFases: FasePresupuesto[] = ['BORRADOR', 'LICITACION', 'CONTRACTUAL', 'META'];
  
  const handleVerDetalle = (id_presupuesto: string) => {
    router.push(`/presupuestos/${id_presupuesto}`);
  };
  
  const handleVerEstructura = (id_presupuesto: string) => {
    router.push(`/proyectos/${id_proyecto}/estructura?presupuesto=${id_presupuesto}`);
  };
  
  const handleEnviarALicitacion = (id_presupuesto: string, nombrePresupuesto: string) => {
    confirm({
      title: 'Enviar a Licitación',
      message: `¿Está seguro que desea enviar el presupuesto "${nombrePresupuesto}" a la fase de Licitación?\n\nEl presupuesto y la versión 1 pasarán a fase LICITACION.`,
      confirmText: 'Sí, enviar a Licitación',
      cancelText: 'Cancelar',
      variant: 'default',
      onConfirm: async () => {
        setIsEnviando(true);
        try {
          await enviarALicitacion.mutateAsync(id_presupuesto);
        } catch (error) {
          console.error('Error al enviar a licitación:', error);
        } finally {
          setIsEnviando(false);
        }
      }
    });
  };

  const handleBorrarGrupoCompleto = () => {
    if (!padre) return;

    confirm({
      title: '¿Eliminar versión borrador?',
      message: `Se eliminará permanentemente:\n• La versión borrador "${padre.nombre_presupuesto}"\n• Todos sus títulos y partidas\n• Todos los recursos y análisis de precios\n• Los precios compartidos asociados\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await eliminarGrupoCompleto.mutateAsync(padre.id_grupo_version || padre.id_presupuesto);
        } catch (error) {
          console.error('Error al borrar el grupo completo:', error);
        }
      }
    });
  };
  
  const toggleFase = (fase: FasePresupuesto) => {
    setFasesExpandidas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(fase)) {
        nuevo.delete(fase);
      } else {
        nuevo.add(fase);
      }
      return nuevo;
    });
  };
  
  const esFaseExpandida = (fase: FasePresupuesto) => {
    // La fase actual siempre está expandida
    if (fase === faseActual) return true;
    // Las demás fases solo si están en el set
    return fasesExpandidas.has(fase);
  };
  
  // Detectar si una versión fue la elegida para la siguiente fase
  const esVersionGanadora = (presupuesto: Presupuesto) => {
    // Versión de LICITACION elegida para CONTRACTUAL
    if (presupuesto.fase === 'LICITACION' && padre?.id_presupuesto_licitacion === presupuesto.id_presupuesto) {
      return true;
    }
    // Versión de CONTRACTUAL elegida para META (cuando se implemente)
    if (presupuesto.fase === 'CONTRACTUAL' && (padre as any)?.id_presupuesto_contractual === presupuesto.id_presupuesto) {
      return true;
    }
    return false;
  };
  
  // Detectar si una versión está cerrada (no fue elegida pero ya hay ganador)
  const esVersionCerrada = (presupuesto: Presupuesto) => {
    // Versiones de LICITACION cerradas (no elegidas para CONTRACTUAL)
    if (presupuesto.fase === 'LICITACION' && 
        padre?.id_presupuesto_licitacion && 
        padre?.id_presupuesto_licitacion !== presupuesto.id_presupuesto) {
      return true;
    }
    // Versiones de CONTRACTUAL cerradas (no elegidas para META) - cuando se implemente
    if (presupuesto.fase === 'CONTRACTUAL' && 
        (padre as any)?.id_presupuesto_contractual && 
        (padre as any)?.id_presupuesto_contractual !== presupuesto.id_presupuesto) {
      return true;
    }
    return false;
  };
  
  return (
    <div className="bg-background backdrop-blur-sm rounded-lg p-4 card-shadow-hover">
      {/* Header del Card - Siempre visible */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {presupuestoPrincipal.nombre_presupuesto}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                faseColors[faseActual] || faseColors.BORRADOR
              }`}
            >
              {faseLabels[faseActual]}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                Creado: {new Date(presupuestoPrincipal.fecha_creacion).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>
                {tieneVersiones 
                  ? `${versiones.length} versión${versiones.length !== 1 ? 'es' : ''}`
                  : 'Sin versiones'
                }
              </span>
            </div>
          </div>
        </div>
        {/* Botones de acción al final del contenedor */}
        <div className="flex items-center gap-1 flex-shrink-0 self-start mt-0.5">
          {padre && padre.fase === 'BORRADOR' && (
            <button
              onClick={handleBorrarGrupoCompleto}
              className="h-5 w-5 p-0 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
              title="Eliminar todo el flujo del presupuesto (solo en estado Borrador)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {padre && (
            <button
              onClick={() => setIsEditPadreModalOpen(true)}
              className="h-5 w-5 p-0 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Configurar presupuesto"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Versiones agrupadas por fase */}
      <div className="pt-3">
        {!tieneVersiones ? (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Cargando versión inicial...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenFases.map((fase) => {
              const versionesFase = versionesPorFase[fase];
              if (versionesFase.length === 0) return null;
              
              const esActual = fase === faseActual;
              const estaExpandida = esFaseExpandida(fase);
              const esColapsada = !esActual && !estaExpandida;
              
              return (
                <div key={fase} className="rounded-md overflow-hidden card-shadow">
                  {/* Header de la fase */}
                  <div
                    className={`px-3 py-2 bg-[var(--card-bg)] flex items-center justify-between ${
                      esActual ? '' : 'cursor-default hover:bg-[var(--hover-bg)]'
                    }`}
                    onClick={() => !esActual && toggleFase(fase)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          faseColors[fase] || faseColors.BORRADOR
                        }`}
                      >
                        {faseLabels[fase]}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {versionesFase.length} versión{versionesFase.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {!esActual && (
                      <button
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFase(fase);
                        }}
                      >
                        {estaExpandida ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Versiones de la fase */}
                  {estaExpandida && (
                    <div className="p-2 space-y-2">
                      {versionesFase.map((presupuesto) => {
                        const esV1Borrador = presupuesto.version === 1 && presupuesto.fase === 'BORRADOR';
                        
                        return (
                          <div
                            key={presupuesto.id_presupuesto}
                            className="px-4 py-2.5 rounded-lg bg-[var(--background)] card-shadow hover:bg-[var(--card-bg)]/50 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              {/* Lado izquierdo: Título */}
                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 whitespace-nowrap ${
                                  presupuesto.fase === 'LICITACION'
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                    : presupuesto.fase === 'CONTRACTUAL'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : presupuesto.fase === 'META'
                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                }`}>
                                  V{presupuesto.version || 1}
                                </span>
                              </div>

                              {/* Centro: Información horizontal - mejor distribuida */}
                              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-1 min-w-0">
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <span className="text-[var(--text-secondary)]">Fecha:</span>
                                  <span className="text-[var(--text-primary)]">
                                    {new Date(presupuesto.fecha_creacion).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <span className="text-[var(--text-secondary)]">Monto:</span>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    S/ {(presupuesto.total_presupuesto ?? presupuesto.parcial_presupuesto ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* Descripción de versión (si existe) */}
                                {presupuesto.descripcion_version && (
                                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0 flex-1">
                                    <FileText className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                                    <span className="truncate">{presupuesto.descripcion_version}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Lado derecho: Badges y Botones al final */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Badges de estado antes de Detalles */}
                                {esVersionGanadora(presupuesto) && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 whitespace-nowrap">
                                    Ganador
                                  </span>
                                )}
                                {esVersionCerrada(presupuesto) && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    Cerrado
                                  </span>
                                )}
                                {/* Badges para META */}
                                {presupuesto.fase === 'META' && presupuesto.estado === 'vigente' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                    Vigente
                                  </span>
                                )}
                                {presupuesto.fase === 'META' && presupuesto.estado === 'aprobado' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 whitespace-nowrap">
                                    Aprobado
                                  </span>
                                )}
                                {presupuesto.fase === 'META' && presupuesto.estado === 'en_revision' && presupuesto.estado_aprobacion?.tipo === 'OFICIALIZAR_META' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                    En Revisión (Oficialización)
                                  </span>
                                )}
                                
                                {/* Botón Detalles/Editar - siempre al final - ESTILO 3: Fondo tenue con sombra */}
                                <button
                                  onClick={() => handleVerEstructura(presupuesto.id_presupuesto)}
                                  className="flex items-center gap-1.5 text-xs h-7 px-3 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
                                >
                                  {presupuesto.fase === 'BORRADOR' ? (
                                    <>
                                      <ListTree className="h-3.5 w-3.5" />
                                      Editar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3.5 w-3.5" />
                                      Detalles
                                    </>
                                  )}
                                </button>
                                
                                {/* Botón Enviar a Licitación - solo para borrador - ESTILO 3 con colores azules */}
                                {esV1Borrador && (
                                  <button
                                    onClick={() => handleEnviarALicitacion(presupuesto.id_presupuesto, presupuesto.nombre_presupuesto)}
                                    disabled={isEnviando}
                                    className="flex items-center gap-1.5 text-xs h-7 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Send className="h-3 w-3" />
                                    {isEnviando ? 'Enviando...' : 'Enviar a Licitación'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para editar configuración del padre */}
      {padre && (
        <Modal
          isOpen={isEditPadreModalOpen}
          onClose={() => setIsEditPadreModalOpen(false)}
          title="Configurar Presupuesto"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditPadreModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="presupuesto-form"
                disabled={updatePresupuestoPadre.isPending}
                className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatePresupuestoPadre.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          }
        >
          <PresupuestoForm
            presupuesto={padre}
            id_proyecto={id_proyecto}
            editMode={true}
            modoCrearPadre={true}
            onSubmit={async (data) => {
              try {
                await updatePresupuestoPadre.mutateAsync({
                  id_presupuesto: padre.id_presupuesto,
                  nombre_presupuesto: data.nombre_presupuesto,
                  porcentaje_igv: data.porcentaje_igv ? parseFloat(data.porcentaje_igv) : undefined,
                  porcentaje_utilidad: data.porcentaje_utilidad ? parseFloat(data.porcentaje_utilidad) : undefined
                });
                setIsEditPadreModalOpen(false);
              } catch (error) {
                console.error('Error al actualizar presupuesto:', error);
              }
            }}
            isLoading={updatePresupuestoPadre.isPending}
            onCancel={() => setIsEditPadreModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
