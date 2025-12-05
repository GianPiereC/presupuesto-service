'use client';

import { DollarSign, Calendar, FileText, Building2, ChevronDown, ChevronUp, Layers, ListTree, Copy, Send, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/modal';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import { useState, useMemo, useEffect } from 'react';
import DetalleVersionModal from '../../presupuestos-licitaciones/components/DetalleVersionModal';
import CrearVersionForm from '../../presupuestos-licitaciones/components/CrearVersionForm';
import { useCreateVersionDesdeVersion, useEnviarVersionMetaAAprobacion, useEnviarVersionMetaAOficializacion } from '@/hooks';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface PresupuestoGrupoCardMetaProps {
  grupoId: string;
  presupuestoPadre: Presupuesto;
  versiones: Presupuesto[];
  nombreProyecto?: string;
}

type TabActivo = 'aprobadas' | 'por_aprobar';

export default function PresupuestoGrupoCardMeta({
  grupoId,
  presupuestoPadre,
  versiones,
  nombreProyecto,
}: PresupuestoGrupoCardMetaProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isCrearVersionModalOpen, setIsCrearVersionModalOpen] = useState(false);
  const [isEnviarAprobacionModalOpen, setIsEnviarAprobacionModalOpen] = useState(false);
  const [isOficializarModalOpen, setIsOficializarModalOpen] = useState(false);
  const [versionSeleccionada, setVersionSeleccionada] = useState<Presupuesto | null>(null);
  const [versionParaAprobacion, setVersionParaAprobacion] = useState<Presupuesto | null>(null);
  const [versionParaOficializar, setVersionParaOficializar] = useState<Presupuesto | null>(null);
  const [comentarioAprobacion, setComentarioAprobacion] = useState('');
  const [comentarioOficializar, setComentarioOficializar] = useState('');
  const [tabActivo, setTabActivo] = useState<TabActivo>('aprobadas');
  const createVersion = useCreateVersionDesdeVersion();
  const enviarAprobacion = useEnviarVersionMetaAAprobacion();
  const enviarOficializacion = useEnviarVersionMetaAOficializacion();

  // Filtrar y ordenar versiones por estado para los tabs
  // "Aprobadas": orden ascendente (V1, V2, V3...) para mantener orden cronológico
  // "Por Aprobar": orden ascendente (V1, V2, V3...) para consistencia
  const versionesPorAprobar = useMemo(() => {
    return [...versiones]
      .filter(v => {
        if (v.fase !== 'META') return false;
        // Excluir versiones en revisión para oficialización (estas se muestran en tab aprobadas)
        if (v.estado === 'en_revision' && v.estado_aprobacion?.tipo === 'OFICIALIZAR_META') return false;
        // Incluir otras versiones en revisión, borrador o rechazado
        return v.estado === 'borrador' || v.estado === 'en_revision' || v.estado === 'rechazado';
      })
      .sort((a, b) => (a.version || 0) - (b.version || 0)); // Orden ascendente: V1, V2, V3...
  }, [versiones]);

  const versionesAprobadas = useMemo(() => {
    return [...versiones]
      .filter(v => {
        if (v.fase !== 'META') return false;
        // Incluir versiones aprobadas o vigentes
        if (v.estado === 'aprobado' || v.estado === 'vigente') return true;
        // Incluir versiones en revisión para oficialización (mantener visible en tab aprobadas)
        if (v.estado === 'en_revision' && v.estado_aprobacion?.tipo === 'OFICIALIZAR_META') return true;
        return false;
      })
      .sort((a, b) => (a.version || 0) - (b.version || 0)); // Orden ascendente: V1, V2, V3...
  }, [versiones]);

  // Versiones a mostrar según el tab activo
  const versionesAMostrar = useMemo(() => {
    return tabActivo === 'por_aprobar' ? versionesPorAprobar : versionesAprobadas;
  }, [tabActivo, versionesPorAprobar, versionesAprobadas]);

  // Versiones ordenadas para el modal (todas las versiones, orden ascendente)
  const versionesOrdenadas = useMemo(() => {
    return [...versiones].sort((a, b) => (a.version || 0) - (b.version || 0));
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

  // Contadores para los tabs
  const totalAprobadas = versionesAprobadas.length;
  const totalPorAprobar = versionesPorAprobar.length;

  // Verificar si hay alguna versión en revisión en el grupo
  const hayVersionEnRevision = useMemo(() => {
    return versiones.some(v => v.fase === 'META' && v.estado === 'en_revision');
  }, [versiones]);

  // Obtener la versión más alta aprobada (no vigente, no en revisión para oficialización) para mostrar el botón de oficializar
  const versionMasAltaAprobada = useMemo(() => {
    const aprobadasNoVigentes = versionesAprobadas.filter(v => 
      v.estado === 'aprobado' && 
      !(v.estado === 'en_revision' && v.estado_aprobacion?.tipo === 'OFICIALIZAR_META')
    );
    if (aprobadasNoVigentes.length === 0) return null;
    return aprobadasNoVigentes.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  }, [versionesAprobadas]);

  // Verificar si hay alguna versión vigente
  const hayVersionVigente = useMemo(() => {
    return versiones.some(v => v.fase === 'META' && v.estado === 'vigente');
  }, [versiones]);

  // Función para obtener el badge de estado
  const getEstadoBadge = (estado?: string, estadoAprobacion?: { tipo?: string | null; estado?: string | null }) => {
    if (!estado) return null;
    
    // Si está en revisión para oficialización, mostrar badge específico
    if (estado === 'en_revision' && estadoAprobacion?.tipo === 'OFICIALIZAR_META') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 flex-shrink-0">
          En Revisión (Oficialización)
        </span>
      );
    }
    
    switch (estado) {
      case 'en_revision':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex-shrink-0">
            En Revisión
          </span>
        );
      case 'rechazado':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 flex-shrink-0">
            Rechazado
          </span>
        );
      case 'aprobado':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 flex-shrink-0">
            Aprobado
          </span>
        );
      case 'vigente':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
            Vigente
          </span>
        );
      default:
        return null;
    }
  };

  // Tab por defecto: siempre empezar con "Aprobadas" al desplegar por primera vez

  const handleVerEstructura = (id_presupuesto: string) => {
    router.push(`/presupuestos-meta/estructura?presupuesto=${id_presupuesto}`);
  };

  const handleVerDetalle = (version: Presupuesto) => {
    setVersionSeleccionada(version);
    setIsDetalleModalOpen(true);
  };

  const handleCrearVersion = () => {
    setIsCrearVersionModalOpen(true);
  };

  const handleConfirmarCrearVersion = async (id_presupuesto_base: string, descripcion_version?: string) => {
    try {
      await createVersion.mutateAsync({
        id_presupuesto_base,
        descripcion_version,
      });
      setIsCrearVersionModalOpen(false);
      // Cambiar automáticamente al tab "Por Aprobar" para ver la nueva versión
      setTabActivo('por_aprobar');
      setIsExpanded(true);
    } catch (error) {
      // El error ya se maneja en el hook con toast
      console.error('Error al crear versión:', error);
    }
  };

  const handleEnviarAprobacion = (version: Presupuesto) => {
    setVersionParaAprobacion(version);
    setComentarioAprobacion('');
    setIsEnviarAprobacionModalOpen(true);
  };

  const handleConfirmarEnviarAprobacion = async () => {
    if (!versionParaAprobacion) return;
    
    try {
      await enviarAprobacion.mutateAsync({
        id_presupuesto_meta: versionParaAprobacion.id_presupuesto,
        comentario: comentarioAprobacion.trim() || undefined,
      });
      setIsEnviarAprobacionModalOpen(false);
      setVersionParaAprobacion(null);
      setComentarioAprobacion('');
      // Refrescar la lista automáticamente
      setIsExpanded(true);
    } catch (error) {
      // El error ya se maneja en el hook con toast
      console.error('Error al enviar a aprobación:', error);
    }
  };

  const handleOficializar = (version: Presupuesto) => {
    setVersionParaOficializar(version);
    setComentarioOficializar('');
    setIsOficializarModalOpen(true);
  };

  const handleConfirmarOficializar = async () => {
    if (!versionParaOficializar) return;
    
    try {
      await enviarOficializacion.mutateAsync({
        id_presupuesto_meta: versionParaOficializar.id_presupuesto,
        comentario: comentarioOficializar.trim() || undefined,
      });
      setIsOficializarModalOpen(false);
      setVersionParaOficializar(null);
      setComentarioOficializar('');
      // Refrescar la lista automáticamente
      setIsExpanded(true);
    } catch (error) {
      // El error ya se maneja en el hook con toast
      console.error('Error al enviar a oficialización:', error);
    }
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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 flex-shrink-0">
                META
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

            {/* Tabs */}
            <div className="flex items-center gap-1 mt-3 border-b border-[var(--border-color)]/20" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTabActivo('aprobadas');
                  setIsExpanded(true);
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-all relative rounded-t ${
                  tabActivo === 'aprobadas'
                    ? isExpanded
                      ? 'text-[var(--text-primary)] bg-[var(--card-bg)]/30'
                      : 'text-[var(--text-primary)] bg-[var(--card-bg)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/10'
                }`}
              >
                Aprobadas ({totalAprobadas})
                {tabActivo === 'aprobadas' && isExpanded && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />
                )}
                {tabActivo === 'aprobadas' && !isExpanded && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/30 rounded-t" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTabActivo('por_aprobar');
                  setIsExpanded(true);
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-all relative rounded-t ${
                  tabActivo === 'por_aprobar'
                    ? isExpanded
                      ? 'text-[var(--text-primary)] bg-[var(--card-bg)]/30'
                      : 'text-[var(--text-primary)] bg-[var(--card-bg)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/10'
                }`}
              >
                Por Aprobar ({totalPorAprobar})
                {tabActivo === 'por_aprobar' && isExpanded && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 rounded-t" />
                )}
                {tabActivo === 'por_aprobar' && !isExpanded && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500/30 rounded-t" />
                )}
              </button>
            </div>
          </div>

          {/* Botones de acción del grupo */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCrearVersion}
              disabled={createVersion.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Crear nueva versión"
            >
              <Copy className="h-4 w-4" />
              Nueva Versión
            </button>
            <button
              className="p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Versiones - Expandible (muestra contenido según tab activo) */}
      {isExpanded && (
        <div className="border-t border-[var(--border-color)]/15 bg-[var(--card-bg)]/20">
          <div className="p-2 space-y-1.5">
            {versionesAMostrar.length > 0 ? (
              versionesAMostrar.map((version) => (
              <div
                key={version.id_presupuesto}
                className="px-2 py-1.5 rounded bg-[var(--background)] card-shadow transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {/* Versión compacta - Badge sutil */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 flex-shrink-0">
                      V{version.version || 1}
                    </span>
                    
                    {/* Badge de estado si existe */}
                    {getEstadoBadge(version.estado, version.estado_aprobacion)}
                    
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

                  {/* Botones de acción para Meta */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Botón Enviar a Aprobación - Solo para versiones en estado borrador y si NO hay ninguna versión en revisión */}
                    {tabActivo === 'por_aprobar' && 
                     version.estado === 'borrador' && 
                     !hayVersionEnRevision && (
                      <button
                        onClick={() => handleEnviarAprobacion(version)}
                        disabled={enviarAprobacion.isPending}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={hayVersionEnRevision ? "Hay una versión en revisión. Debe aprobarse o rechazarse primero." : "Enviar a aprobación"}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Botón Oficializar - Solo para la versión más alta aprobada (no vigente) en tab aprobadas */}
                    {tabActivo === 'aprobadas' && 
                     versionMasAltaAprobada && 
                     version.id_presupuesto === versionMasAltaAprobada.id_presupuesto && 
                     !hayVersionVigente && (
                      <button
                        onClick={() => handleOficializar(version)}
                        disabled={enviarOficializacion.isPending}
                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Enviar a oficialización (poner en vigencia)"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Botón Estructura - Verde */}
                    <button
                      onClick={() => handleVerEstructura(version.id_presupuesto)}
                      className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm hover:shadow transition-all duration-200"
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
              ))
            ) : (
              <div className="px-2 py-4 text-center">
                {tabActivo === 'por_aprobar' ? (
                  <div className="space-y-[0.5]">
                    <p className="text-xs text-[var(--text-secondary)]">
                      No hay versiones pendientes de aprobación
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]/70">
                      Crea una nueva versión para enviarla a aprobación
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    No hay versiones aprobadas
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear versión */}
      <Modal
        isOpen={isCrearVersionModalOpen}
        onClose={() => setIsCrearVersionModalOpen(false)}
        title={`Crear Nueva Versión - ${presupuestoPadre.nombre_presupuesto}`}
        size="md"
      >
        <CrearVersionForm
          versiones={versionesOrdenadas}
          onConfirm={handleConfirmarCrearVersion}
          onCancel={() => setIsCrearVersionModalOpen(false)}
          isLoading={createVersion.isPending}
        />
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

      {/* Modal para enviar a aprobación */}
      <Modal
        isOpen={isEnviarAprobacionModalOpen}
        onClose={() => {
          setIsEnviarAprobacionModalOpen(false);
          setVersionParaAprobacion(null);
          setComentarioAprobacion('');
        }}
        title={`Enviar a Aprobación - V${versionParaAprobacion?.version || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              ¿Desea enviar la versión <strong>V{versionParaAprobacion?.version || ''}</strong> a aprobación?
            </p>
            {versionParaAprobacion && (
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Monto: <strong>S/ {versionParaAprobacion.total_presupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Comentario (opcional)
            </label>
            <Textarea
              value={comentarioAprobacion}
              onChange={(e) => setComentarioAprobacion(e.target.value)}
              placeholder="Ingrese un comentario sobre esta solicitud de aprobación..."
              rows={4}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEnviarAprobacionModalOpen(false);
                setVersionParaAprobacion(null);
                setComentarioAprobacion('');
              }}
              disabled={enviarAprobacion.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmarEnviarAprobacion}
              disabled={enviarAprobacion.isPending}
            >
              {enviarAprobacion.isPending ? 'Enviando...' : 'Enviar a Aprobación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para enviar a oficialización */}
      <Modal
        isOpen={isOficializarModalOpen}
        onClose={() => {
          setIsOficializarModalOpen(false);
          setVersionParaOficializar(null);
          setComentarioOficializar('');
        }}
        title={`Oficializar Versión - V${versionParaOficializar?.version || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              ¿Desea oficializar la versión <strong>V{versionParaOficializar?.version || ''}</strong> (poner en vigencia)?
            </p>
            {versionParaOficializar && (
              <>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Monto: <strong>S/ {versionParaOficializar.total_presupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </p>
                {hayVersionVigente && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    ⚠️ Advertencia: Ya existe una versión vigente. Esta acción la reemplazará.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Comentario (opcional)
            </label>
            <Textarea
              value={comentarioOficializar}
              onChange={(e) => setComentarioOficializar(e.target.value)}
              placeholder="Ingrese un comentario sobre esta solicitud de oficialización..."
              rows={4}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              variant="secondary"
              onClick={() => {
                setIsOficializarModalOpen(false);
                setVersionParaOficializar(null);
                setComentarioOficializar('');
              }}
              disabled={enviarOficializacion.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmarOficializar}
              disabled={enviarOficializacion.isPending}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {enviarOficializacion.isPending ? 'Enviando...' : 'Enviar a Oficialización'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

