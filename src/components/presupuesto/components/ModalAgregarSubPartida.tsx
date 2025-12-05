'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '@/components/ui/modal';
import AutocompletePartida from './AutocompletePartida';
import AutocompleteRecurso from './AutocompleteRecurso';
import { useApuByPartida, type TipoRecursoApu } from '@/hooks/useAPU';
import { Partida } from '@/hooks/usePartidas';
import { Recurso } from '@/hooks/useRecursos';
import { mapearTipoCostoRecursoATipoApu } from '@/utils/tipoRecursoMapper';
import { executeQuery } from '@/services/graphql-client';
import { GET_PRECIO_RECURSO_BY_PRESUPUESTO_Y_RECURSO } from '@/graphql/queries';
import { usePrecioSync } from '@/context/precio-sync-context';

interface ModalAgregarSubPartidaProps {
  isOpen: boolean;
  onClose: () => void;
  partidas: Partida[];
  id_presupuesto?: string;
  id_proyecto?: string;
  id_partida_padre?: string | null;
  onAgregarSubPartida?: (subPartida: PartidaLocal) => void;
  subPartidaParaEditar?: { id: string; recursos: any[]; idPartidaOriginal?: string | null; rendimiento?: number; jornada?: number; descripcion?: string } | null;
  onActualizarSubPartida?: (idSubPartida: string, subPartida: PartidaLocal) => void;
  modo?: 'edicion' | 'lectura' | 'meta' | 'licitacion' | 'contractual';
}

interface PartidaLocal {
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre: string | null;
  nivel_partida: number;
  numero_item: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
  orden: number;
  estado: 'Activa' | 'Inactiva';
  recursos?: RecursoAPUEditable[];
  rendimiento?: number;
  jornada?: number;
  id_partida_original?: string; // ID de la partida original usada para crear la subpartida
}

interface RecursoAPUEditable {
  id_recurso_apu: string;
  recurso_id: string;
  codigo_recurso: string;
  descripcion: string;
  tipo_recurso: TipoRecursoApu;
  unidad_medida: string;
  id_precio_recurso: string | null;
  precio: number;
  cuadrilla?: number;
  cantidad: number;
  desperdicio_porcentaje?: number;
  parcial: number;
  orden: number;
  enEdicion?: boolean;
  esNuevo?: boolean;
}

export default function ModalAgregarSubPartida({
  isOpen,
  onClose,
  partidas,
  id_presupuesto,
  id_proyecto,
  id_partida_padre,
  onAgregarSubPartida,
  subPartidaParaEditar,
  onActualizarSubPartida,
  modo = 'edicion',
}: ModalAgregarSubPartidaProps) {
  // Convertir modos especiales a 'lectura' si no son 'edicion'
  const modoReal = modo === 'edicion' ? 'edicion' : 'lectura';
  const esModoLectura = modoReal === 'lectura';
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<Partida | null>(null);
  const [idSubPartidaEditando, setIdSubPartidaEditando] = useState<string | null>(null);
  const [recursosEditables, setRecursosEditables] = useState<RecursoAPUEditable[]>([]);
  const [rendimiento, setRendimiento] = useState<number>(1.0);
  const [jornada, setJornada] = useState<number>(8);
  const [rendimientoInput, setRendimientoInput] = useState<string>('1.0');
  const [jornadaInput, setJornadaInput] = useState<string>('8');
  const [hasChanges, setHasChanges] = useState(false);
  const [descripcionSubpartida, setDescripcionSubpartida] = useState<string>('');

  // Guardar valores originales para poder cancelar
  const [valoresOriginales, setValoresOriginales] = useState<{
    rendimiento: number;
    jornada: number;
    recursos: RecursoAPUEditable[];
  } | null>(null);

  // Cargar APU de la partida seleccionada
  const { data: apuData, isLoading: isLoadingApu, refetch: refetchApu } = useApuByPartida(
    partidaSeleccionada?.id_partida || null
  );
  const precioSync = usePrecioSync();

  // Limpiar cuando cambia la partida seleccionada (solo si no se está editando)
  useEffect(() => {
    // No hacer nada si se está editando una subpartida - los recursos ya se cargaron en el otro efecto
    if (subPartidaParaEditar && isOpen) {
      return;
    }
    
    if (partidaSeleccionada) {
      refetchApu();
      // Inicializar descripción con la descripción de la partida seleccionada si no hay una descripción ya establecida
      if (!descripcionSubpartida && !subPartidaParaEditar) {
        setDescripcionSubpartida(partidaSeleccionada.descripcion);
      }
    } else {
      setRecursosEditables([]);
      setRendimiento(1.0);
      setJornada(8);
      setRendimientoInput('1.0');
      setJornadaInput('8');
      setDescripcionSubpartida('');
      setValoresOriginales({
        rendimiento: 1.0,
        jornada: 8,
        recursos: [],
      });
      setHasChanges(false);
    }
  }, [partidaSeleccionada, refetchApu, subPartidaParaEditar, isOpen]);

  // Cargar recursos cuando se está editando una subpartida
  useEffect(() => {
    if (subPartidaParaEditar && isOpen) {
      // Guardar el ID de la subpartida que se está editando
      setIdSubPartidaEditando(subPartidaParaEditar.id);
      
      // Cargar la descripción de la subpartida si existe
      if (subPartidaParaEditar.descripcion) {
        setDescripcionSubpartida(subPartidaParaEditar.descripcion);
      }
      
      // Buscar la partida original que se usó para crear la subpartida
      // IMPORTANTE: usar idPartidaOriginal, no el id de la subpartida (que es temporal)
      let idPartidaABuscar = subPartidaParaEditar.idPartidaOriginal;
      
      // Si no hay idPartidaOriginal, intentar extraerlo de los recursos
      if (!idPartidaABuscar && subPartidaParaEditar.recursos && subPartidaParaEditar.recursos.length > 0) {
        idPartidaABuscar = (subPartidaParaEditar.recursos[0] as any).id_partida_original || null;
      }
      
      // Si aún no hay, buscar en la estructura de datos de la subpartida
      if (!idPartidaABuscar && (subPartidaParaEditar as any).id_partida_original) {
        idPartidaABuscar = (subPartidaParaEditar as any).id_partida_original;
      }
      
      if (idPartidaABuscar) {
        const partidaEncontrada = partidas.find(p => p.id_partida === idPartidaABuscar);
        if (partidaEncontrada) {
          // Seleccionar la partida inmediatamente
          setPartidaSeleccionada(partidaEncontrada);
        }
      }
      
      // PRIORIDAD: Usar datos locales si existen (incluyen cambios recientes sin guardar)
      // Solo cargar desde backend si NO hay datos locales
      const cargarDatos = async () => {
        // Si hay recursos en subPartidaParaEditar, usar esos (datos locales actualizados)
        if (subPartidaParaEditar.recursos && subPartidaParaEditar.recursos.length > 0) {
          // Usar los datos locales (que incluyen los cambios recientes)
          const rendimientoGuardado = (subPartidaParaEditar as any).rendimiento || 1.0;
          const jornadaGuardada = (subPartidaParaEditar as any).jornada || 8;
          
          setRendimiento(rendimientoGuardado);
          setJornada(jornadaGuardada);
          setRendimientoInput(String(rendimientoGuardado));
          setJornadaInput(String(jornadaGuardada));
          
          const recursosEditable: RecursoAPUEditable[] = subPartidaParaEditar.recursos.map((r, index) => {
            const precioSincronizado = r.recurso_id ? precioSync.obtenerPrecio(r.recurso_id) : undefined;
            const precioFinal = precioSincronizado !== undefined ? precioSincronizado : (r.precio || 0);
            
            const recurso: RecursoAPUEditable = {
              id_recurso_apu: r.id_recurso_apu || `temp-${index}`,
              recurso_id: r.recurso_id || '',
              codigo_recurso: r.codigo_recurso || '',
              descripcion: r.descripcion || '',
              tipo_recurso: r.tipo_recurso || 'MATERIAL',
              unidad_medida: r.unidad_medida || '',
              id_precio_recurso: r.id_precio_recurso || null,
              precio: precioFinal,
              cuadrilla: r.cuadrilla,
              cantidad: r.cantidad || 0,
              desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
              parcial: 0, // Se calculará después
              orden: r.orden || index,
              esNuevo: false,
            };
            
            recurso.parcial = calcularParcial(recurso);
            return recurso;
          });
          
          setRecursosEditables(recursosEditable);
          
          setValoresOriginales({
            rendimiento: rendimientoGuardado,
            jornada: jornadaGuardada,
            recursos: JSON.parse(JSON.stringify(recursosEditable)),
          });
          setHasChanges(false);
          return; // Salir temprano, usar datos locales
        }
        
        // Solo si NO hay datos locales, cargar desde el backend
        if (subPartidaParaEditar.id && !subPartidaParaEditar.id.startsWith('temp_')) {
          try {
            const { GET_APU_BY_PARTIDA_QUERY } = await import('@/graphql/queries/apu.queries');
            const subpartidaApuResponse = await executeQuery<{ getApuByPartida: any }>(
              GET_APU_BY_PARTIDA_QUERY,
              { id_partida: subPartidaParaEditar.id }
            );
            
            if (subpartidaApuResponse?.getApuByPartida) {
              const subpartidaApu = subpartidaApuResponse.getApuByPartida;
              
              const partidaSubpartida = partidas.find(p => p.id_partida === subPartidaParaEditar.id);
              if (partidaSubpartida && partidaSubpartida.descripcion) {
                setDescripcionSubpartida(partidaSubpartida.descripcion);
              } else if (subPartidaParaEditar.descripcion) {
                setDescripcionSubpartida(subPartidaParaEditar.descripcion);
              }
              
              const rendimientoBackend = subpartidaApu.rendimiento || 1.0;
              const jornadaBackend = subpartidaApu.jornada || 8;
              
              setRendimiento(rendimientoBackend);
              setJornada(jornadaBackend);
              setRendimientoInput(String(rendimientoBackend));
              setJornadaInput(String(jornadaBackend));
              
              const recursosEditable: RecursoAPUEditable[] = (subpartidaApu.recursos || []).map((r: any, index: number) => {
                const precioSincronizado = r.recurso_id ? precioSync.obtenerPrecio(r.recurso_id) : undefined;
                const precioFinal = precioSincronizado !== undefined ? precioSincronizado : (r.precio || 0);
                
                const recurso: RecursoAPUEditable = {
                  id_recurso_apu: r.id_recurso_apu,
                  recurso_id: r.recurso_id || '',
                  codigo_recurso: r.codigo_recurso || '',
                  descripcion: r.descripcion || '',
                  tipo_recurso: r.tipo_recurso || 'MATERIAL',
                  unidad_medida: r.unidad_medida || '',
                  id_precio_recurso: r.id_precio_recurso || null,
                  precio: precioFinal,
                  cuadrilla: r.cuadrilla,
                  cantidad: r.cantidad || 0,
                  desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
                  parcial: 0,
                  orden: r.orden || index,
                  esNuevo: false,
                };
                
                recurso.parcial = calcularParcial(recurso);
                return recurso;
              });
              
              setRecursosEditables(recursosEditable);
              
              setValoresOriginales({
                rendimiento: rendimientoBackend,
                jornada: jornadaBackend,
                recursos: JSON.parse(JSON.stringify(recursosEditable)),
              });
              setHasChanges(false);
              return;
            }
          } catch (error) {
            // Error silencioso al cargar datos desde backend
          }
        }
        
        // Fallback: Si no hay datos locales ni backend, usar valores por defecto
        const rendimientoGuardado = (subPartidaParaEditar as any).rendimiento || 1.0;
        const jornadaGuardada = (subPartidaParaEditar as any).jornada || 8;
        
        setRendimiento(rendimientoGuardado);
        setJornada(jornadaGuardada);
        setRendimientoInput(String(rendimientoGuardado));
        setJornadaInput(String(jornadaGuardada));
        
        setRecursosEditables([]);
        setValoresOriginales({
          rendimiento: rendimientoGuardado,
          jornada: jornadaGuardada,
          recursos: [],
        });
        setHasChanges(false);
      };
      
      cargarDatos();
    } else if (!subPartidaParaEditar) {
      // Si no se está editando, limpiar el ID
      setIdSubPartidaEditando(null);
    }
  }, [subPartidaParaEditar, partidas, isOpen]);

  // Cargar datos del APU cuando están disponibles (solo si no se está editando una subpartida)
  useEffect(() => {
    // IMPORTANTE: No cargar datos del APU si se está editando una subpartida
    // porque los recursos ya se cargaron desde los datos locales guardados
    if (subPartidaParaEditar && isOpen) {
      return;
    }
    
    if (apuData && !subPartidaParaEditar) {
      const nuevoRendimiento = apuData.rendimiento || 1.0;
      const nuevaJornada = apuData.jornada || 8;
      setRendimiento(nuevoRendimiento);
      setJornada(nuevaJornada);
      setRendimientoInput(String(nuevoRendimiento));
      setJornadaInput(String(nuevaJornada));
      const recursosEditable: RecursoAPUEditable[] = apuData.recursos.map((r, index) => {
        // Usar precio del contexto si existe, sino usar precio del backend
        const precioSincronizado = r.recurso_id ? precioSync.obtenerPrecio(r.recurso_id) : undefined;
        const precioFinal = precioSincronizado !== undefined ? precioSincronizado : (r.precio || 0);
        
        const recurso: RecursoAPUEditable = {
          id_recurso_apu: r.id_recurso_apu,
          recurso_id: r.recurso_id || '',
          codigo_recurso: r.codigo_recurso,
          descripcion: r.descripcion,
          tipo_recurso: r.tipo_recurso,
          unidad_medida: r.unidad_medida,
          id_precio_recurso: r.id_precio_recurso,
          precio: precioFinal,
          cuadrilla: r.cuadrilla,
          cantidad: r.cantidad,
          desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
          parcial: 0, // Se calculará después
          orden: r.orden,
          esNuevo: false,
        };
        
        // Calcular parcial después de crear el objeto completo
        recurso.parcial = calcularParcial(recurso);
        return recurso;
      });
      setRecursosEditables(recursosEditable);
      
      setValoresOriginales({
        rendimiento: nuevoRendimiento,
        jornada: nuevaJornada,
        recursos: JSON.parse(JSON.stringify(recursosEditable)),
      });
      setHasChanges(false);
    } else if (partidaSeleccionada && !isLoadingApu && !subPartidaParaEditar) {
      // Solo limpiar si NO se está editando una subpartida
      setRecursosEditables([]);
      setRendimiento(1.0);
      setJornada(8);
      setRendimientoInput('1.0');
      setJornadaInput('8');
      setValoresOriginales({
        rendimiento: 1.0,
        jornada: 8,
        recursos: [],
      });
      setHasChanges(false);
    }
  }, [apuData, partidaSeleccionada, isLoadingApu]);

  // Inicializar precios en el contexto después del render (evitar error de React)
  // NOTA: Este efecto ya no es necesario porque ahora usamos los precios del contexto al cargar
  // Pero lo mantenemos para actualizar el contexto si hay precios nuevos que no están sincronizados
  useEffect(() => {
    if (recursosEditables.length === 0) return;
    
    // Usar queueMicrotask para ejecutar después del render (más eficiente que setTimeout)
    queueMicrotask(() => {
      recursosEditables.forEach(r => {
        if (r.recurso_id && r.precio !== undefined && r.precio !== null) {
          // Solo actualizar si el precio local es diferente al del contexto
          // Esto permite que el contexto tenga la última versión del precio
          const precioActual = precioSync.obtenerPrecio(r.recurso_id);
          if (precioActual === undefined || Math.abs(precioActual - r.precio) > 0.001) {
            // Solo actualizar si el precio local es más reciente (mayor) o no existe en contexto
            // Esto evita sobrescribir cambios más recientes del panel principal
            precioSync.actualizarPrecio(r.recurso_id, r.precio, 'ModalAgregarSubPartida-inicializar');
          }
        }
      });
    });
  }, [recursosEditables.map(r => `${r.recurso_id}-${r.precio}`).join(','), precioSync]);

  // Suscribirse a cambios de precio del contexto y actualizar recursos locales
  useEffect(() => {
    const desuscripciones: (() => void)[] = [];
    const recursoIdsSuscritos = new Set<string>();
    
    recursosEditables.forEach(r => {
      if (r.recurso_id && !recursoIdsSuscritos.has(r.recurso_id)) {
        recursoIdsSuscritos.add(r.recurso_id);
        const recursoId = r.recurso_id;
        const desuscripcion = precioSync.suscribirse(recursoId, (nuevoPrecio) => {
          // Solo actualizar si el precio es diferente (evitar loops)
          setRecursosEditables(prev => {
            let hayCambios = false;
            const actualizados = prev.map(recurso => {
              // Actualizar todos los recursos con este recurso_id
              if (recurso.recurso_id === recursoId) {
                if (Math.abs((recurso.precio || 0) - nuevoPrecio) > 0.001) {
                  hayCambios = true;
                  return {
                    ...recurso,
                    precio: nuevoPrecio,
                    parcial: calcularParcial({ ...recurso, precio: nuevoPrecio })
                  };
                }
              }
              // Si es EQUIPO con unidad "%mo", recalcular precio basado en nueva suma de MO
              if (recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo')) {
                const sumaHHManoObra = prev
                  .filter(rm => rm.tipo_recurso === 'MANO_OBRA')
                  .reduce((suma, rm) => {
                    if (!rendimiento || rendimiento <= 0) return suma;
                    if (!jornada || jornada <= 0) return suma;
                    const cuadrillaValue = rm.cuadrilla || 1;
                    const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (rm.precio || 0);
                    return suma + parcialMO;
                  }, 0);
                const nuevoPrecioEquipo = roundToTwo(sumaHHManoObra);
                if (Math.abs((recurso.precio || 0) - nuevoPrecioEquipo) > 0.001) {
                  hayCambios = true;
                  return {
                    ...recurso,
                    precio: nuevoPrecioEquipo,
                    parcial: calcularParcial({ ...recurso, precio: nuevoPrecioEquipo })
                  };
                }
              }
              return recurso;
            });
            
            if (hayCambios) {
              setHasChanges(true);
            }
            return actualizados;
          });
        });
        desuscripciones.push(desuscripcion);
      }
    });
    
    return () => {
      desuscripciones.forEach(desuscripcion => desuscripcion());
    };
  }, [recursosEditables.map(r => r.recurso_id).join(','), rendimiento, jornada, precioSync]);

  // Funciones helper
  const truncateToFour = (num: number): number => {
    return Math.round(num * 10000) / 10000;
  };

  const roundToTwo = (num: number): number => {
    return Math.round(num * 100) / 100;
  };

  const calcularCantidadDesdeCuadrilla = (cuadrilla: number): number => {
    if (!rendimiento || rendimiento <= 0) return 0;
    return truncateToFour((jornada * cuadrilla) / rendimiento);
  };

  const calcularCuadrillaDesdeCantidad = (cantidad: number): number => {
    if (!jornada || jornada <= 0) return 0;
    return truncateToFour((cantidad * rendimiento) / jornada);
  };

  const calcularSumaParcialesManoObra = useCallback((): number => {
    return recursosEditables
      .filter((r) => r.tipo_recurso === 'MANO_OBRA' && r.unidad_medida?.toLowerCase() === 'hh')
      .reduce((suma, r) => {
        if (!rendimiento || rendimiento <= 0) return suma;
        if (!jornada || jornada <= 0) return suma;
        const cuadrillaValue = r.cuadrilla || 1;
        const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
        return suma + parcialMO;
      }, 0);
  }, [recursosEditables, rendimiento, jornada]);

  const calcularParcial = (recurso: RecursoAPUEditable): number => {
    const { tipo_recurso, cantidad, precio, cuadrilla, desperdicio_porcentaje, unidad_medida } =
      recurso;

    switch (tipo_recurso) {
      case 'MATERIAL':
        const cantidadConDesperdicio = cantidad * (1 + (desperdicio_porcentaje || 0) / 100);
        return roundToTwo(cantidadConDesperdicio * precio);

      case 'MANO_OBRA': {
        if (!rendimiento || rendimiento <= 0) return 0;
        if (!jornada || jornada <= 0) return 0;
        const cuadrillaValue = cuadrilla || 1;
        return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
      }

      case 'EQUIPO':
        if (unidad_medida === '%mo' || unidad_medida?.toLowerCase() === '%mo') {
          const sumaHHManoObra = calcularSumaParcialesManoObra();
          return roundToTwo(sumaHHManoObra * (cantidad / 100));
        }
        if (unidad_medida === 'hm' || unidad_medida?.toLowerCase() === 'hm') {
          if (!rendimiento || rendimiento <= 0) return 0;
          if (!jornada || jornada <= 0) return 0;
          const cuadrillaValue = cuadrilla || 1;
          return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
        }
        return roundToTwo(cantidad * precio);

      case 'SUBCONTRATO':
        return roundToTwo(cantidad * precio);

      default:
        return roundToTwo(cantidad * precio);
    }
  };

  const handleSelectPartida = (partida: Partida) => {
    setPartidaSeleccionada(partida);
  };

  const handleAgregarInsumo = () => {
    const nuevoId = `nuevo-${Date.now()}`;
    const nuevaFila: RecursoAPUEditable = {
      id_recurso_apu: nuevoId,
      recurso_id: '',
      codigo_recurso: '',
      descripcion: '',
      tipo_recurso: 'MATERIAL',
      unidad_medida: '',
      id_precio_recurso: null,
      precio: 0,
      cuadrilla: undefined,
      cantidad: 0,
      parcial: 0,
      orden: recursosEditables.length,
      enEdicion: true,
      esNuevo: true,
    };
    setRecursosEditables([...recursosEditables, nuevaFila]);
    setHasChanges(true);
  };

  const handleSeleccionarRecurso = async (recursoId: string, recurso: Recurso) => {
    const tipoRecurso = mapearTipoCostoRecursoATipoApu(
      recurso.tipo_costo_recurso?.nombre,
      recurso.tipo_costo_recurso?.codigo
    );

    let precioInicial = recurso.precio_actual || 0;
    let id_precio_recurso_existente: string | null = null;

    if (id_presupuesto && recurso.id) {
      try {
        const response = await executeQuery<{ getPrecioRecursoByPresupuestoYRecurso: any }>(
          GET_PRECIO_RECURSO_BY_PRESUPUESTO_Y_RECURSO,
          {
            id_presupuesto: id_presupuesto,
            recurso_id: recurso.id,
          }
        );

        if (response.getPrecioRecursoByPresupuestoYRecurso) {
          precioInicial = response.getPrecioRecursoByPresupuestoYRecurso.precio;
          id_precio_recurso_existente =
            response.getPrecioRecursoByPresupuestoYRecurso.id_precio_recurso;
        }
      } catch (error) {
        // Usar precio del catálogo si hay error
      }
    }

    setRecursosEditables((prev) => {
      const sumaHHManoObra = prev
        .filter((r) => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      return prev
        .map((r) => {
          if (r.id_recurso_apu === recursoId) {
            const unidadMedida = recurso.unidad?.nombre || '';
            const precioFinal =
              tipoRecurso === 'EQUIPO' &&
              (unidadMedida === '%mo' || unidadMedida?.toLowerCase() === '%mo')
                ? roundToTwo(sumaHHManoObra)
                : roundToTwo(precioInicial);

            const nuevoRecurso: RecursoAPUEditable = {
              ...r,
              recurso_id: recurso.id,
              descripcion: recurso.nombre,
              codigo_recurso: recurso.codigo || '',
              unidad_medida: unidadMedida,
              tipo_recurso: tipoRecurso,
              id_precio_recurso: id_precio_recurso_existente,
              precio: precioFinal,
              parcial: 0, // Se calculará después
              enEdicion: false,
            };
            
            // Calcular parcial después de crear el objeto completo
            nuevoRecurso.parcial = calcularParcial(nuevoRecurso);

            // NO actualizar contexto aquí - solo se actualiza cuando se guarda la subpartida
            return nuevoRecurso;
          }
          return r;
        })
        .map((r) => ({
          ...r,
          parcial: calcularParcial(r),
        }));
    });
    setHasChanges(true);
  };

  const handleUpdateRecurso = (
    recursoId: string,
    campo: keyof RecursoAPUEditable,
    valor: string | number | null
  ) => {
    setRecursosEditables((prev) => {
      const sumaHHManoObra = prev
        .filter((r) => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      return prev
        .map((r) => {
          if (r.id_recurso_apu === recursoId) {
            const numValor = typeof valor === 'string' ? parseFloat(valor) || 0 : valor || 0;
            const nuevoRecurso = { ...r };

            const unidadMedidaLower = r.unidad_medida?.toLowerCase() || '';
            const esManoObraConHh = r.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh';
            const esEquipoConHm = r.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm';
            const esEquipoConPorcentajeMo =
              r.tipo_recurso === 'EQUIPO' && unidadMedidaLower === '%mo';

            if (esManoObraConHh || esEquipoConHm) {
              if (campo === 'cuadrilla') {
                nuevoRecurso.cuadrilla = truncateToFour(numValor);
                nuevoRecurso.cantidad = calcularCantidadDesdeCuadrilla(nuevoRecurso.cuadrilla);
              } else if (campo === 'cantidad') {
                nuevoRecurso.cantidad = truncateToFour(numValor);
                nuevoRecurso.cuadrilla = calcularCuadrillaDesdeCantidad(nuevoRecurso.cantidad);
              } else if (campo === 'precio') {
                nuevoRecurso.precio = roundToTwo(numValor);
                // NO actualizar contexto aquí - solo se actualiza cuando se guarda la subpartida
              } else if (campo === 'desperdicio_porcentaje') {
                nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
              } else {
                (nuevoRecurso as any)[campo] = numValor;
              }
            } else if (esEquipoConPorcentajeMo) {
              if (campo === 'cantidad') {
                nuevoRecurso.cantidad = truncateToFour(numValor);
              } else if (campo === 'precio') {
                return r;
              } else if (campo === 'desperdicio_porcentaje') {
                nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
              } else {
                (nuevoRecurso as any)[campo] = numValor;
              }
              nuevoRecurso.precio = roundToTwo(sumaHHManoObra);
            } else if (r.tipo_recurso === 'EQUIPO') {
              if (campo === 'cantidad') {
                nuevoRecurso.cantidad = truncateToFour(numValor);
              } else if (campo === 'precio') {
                nuevoRecurso.precio = roundToTwo(numValor);
                // NO actualizar contexto aquí - solo se actualiza cuando se guarda la subpartida
              } else if (campo === 'desperdicio_porcentaje') {
                nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
              } else {
                (nuevoRecurso as any)[campo] = numValor;
              }
            } else {
            if (campo === 'cantidad') {
              nuevoRecurso.cantidad = truncateToFour(numValor);
            } else if (campo === 'precio') {
              nuevoRecurso.precio = roundToTwo(numValor);
              // NO actualizar contexto aquí - solo se actualiza cuando se guarda la subpartida
            } else if (campo === 'cuadrilla') {
                nuevoRecurso.cuadrilla = truncateToFour(numValor);
              } else if (campo === 'desperdicio_porcentaje') {
                nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
              } else {
                (nuevoRecurso as any)[campo] = numValor;
              }
            }

            return nuevoRecurso;
          }

          if (r.tipo_recurso === 'EQUIPO' && (r.unidad_medida === '%mo' || r.unidad_medida?.toLowerCase() === '%mo')) {
            return {
              ...r,
              precio: roundToTwo(sumaHHManoObra),
            };
          }

          return r;
        })
        .map((r) => ({
          ...r,
          parcial: calcularParcial(r),
        }));
    });
    setHasChanges(true);
  };

  // Recalcular cuando cambian rendimiento o jornada
  useEffect(() => {
    if (recursosEditables.length > 0 && rendimiento > 0 && jornada > 0) {
      const sumaHHManoObra = recursosEditables
        .filter((r) => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      setRecursosEditables((prev) =>
        prev.map((r) => {
          const nuevoRecurso = { ...r };

          if (r.tipo_recurso === 'EQUIPO' && (r.unidad_medida === '%mo' || r.unidad_medida?.toLowerCase() === '%mo')) {
            nuevoRecurso.precio = roundToTwo(sumaHHManoObra);
          }

          const unidadMedidaLower = r.unidad_medida?.toLowerCase() || '';
          const debeSincronizarCuadrilla =
            (r.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
            (r.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');

          if (debeSincronizarCuadrilla && r.cuadrilla) {
            nuevoRecurso.cantidad = calcularCantidadDesdeCuadrilla(r.cuadrilla);
          }

          nuevoRecurso.parcial = calcularParcial(nuevoRecurso);

          return nuevoRecurso;
        })
      );
      if (valoresOriginales && recursosEditables.length > 0) {
        setHasChanges(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendimiento, jornada]);

  const handleEliminarRecurso = (recursoId: string) => {
    setRecursosEditables((prev) => prev.filter((r) => r.id_recurso_apu !== recursoId));
    setHasChanges(true);
  };

  const handleCancelarCambios = () => {
    if (!valoresOriginales) return;

    setRendimiento(valoresOriginales.rendimiento);
    setJornada(valoresOriginales.jornada);
    setRendimientoInput(String(valoresOriginales.rendimiento));
    setJornadaInput(String(valoresOriginales.jornada));
    setRecursosEditables(JSON.parse(JSON.stringify(valoresOriginales.recursos)));
    setHasChanges(false);
  };

  const totales = useMemo(() => {
    return recursosEditables.reduce(
      (acc, r) => ({
        costo_materiales: acc.costo_materiales + (r.tipo_recurso === 'MATERIAL' ? r.parcial : 0),
        costo_mano_obra: acc.costo_mano_obra + (r.tipo_recurso === 'MANO_OBRA' ? r.parcial : 0),
        costo_equipos: acc.costo_equipos + (r.tipo_recurso === 'EQUIPO' ? r.parcial : 0),
        costo_subcontratos:
          acc.costo_subcontratos + (r.tipo_recurso === 'SUBCONTRATO' ? r.parcial : 0),
        costo_directo: acc.costo_directo + r.parcial,
      }),
      {
        costo_materiales: 0,
        costo_mano_obra: 0,
        costo_equipos: 0,
        costo_subcontratos: 0,
        costo_directo: 0,
      }
    );
  }, [recursosEditables]);

  const handleAgregarSubPartida = useCallback(() => {
    if (!partidaSeleccionada || !id_partida_padre || !id_presupuesto || !id_proyecto) {
      return;
    }

    if (recursosEditables.length === 0) {
      return;
    }

    // Buscar la partida padre para obtener id_titulo y nivel_partida
    const partidaPadre = partidas.find(p => p.id_partida === id_partida_padre);
    if (!partidaPadre) {
      return;
    }

    // El precio unitario (CU) es el costo directo calculado
    const precioUnitario = totales.costo_directo;

    // Si se está editando una subpartida existente, actualizarla en lugar de crear una nueva
    if (idSubPartidaEditando && onActualizarSubPartida) {
      
      const subPartidaActualizada: PartidaLocal = {
        id_partida: idSubPartidaEditando, // Mantener el mismo ID
        id_presupuesto: id_presupuesto,
        id_proyecto: id_proyecto,
        id_titulo: partidaPadre.id_titulo,
        id_partida_padre: id_partida_padre,
        nivel_partida: partidaPadre.nivel_partida + 1,
        numero_item: '', // Se calculará en el padre
        descripcion: descripcionSubpartida || partidaSeleccionada.descripcion,
        unidad_medida: partidaSeleccionada.unidad_medida,
        metrado: 1, // Se editará en el panel
        precio_unitario: precioUnitario, // CU = costo directo del modal
        parcial_partida: precioUnitario, // Se recalculará en el panel cuando cambie el metrado
        orden: 0, // Se calculará en el padre
        estado: 'Activa',
        // Guardar TODOS los recursos con el ID de la partida original
        recursos: recursosEditables.map((r) => ({ 
          ...r,
          id_partida_original: partidaSeleccionada.id_partida, // Guardar el ID de la partida original en cada recurso
        })),
        // Guardar también rendimiento y jornada actualizados
        rendimiento: rendimiento,
        jornada: jornada,
        // Guardar el ID de la partida original directamente
        id_partida_original: partidaSeleccionada.id_partida,
      };
      
      // Actualizar precios en el contexto de sincronización antes de guardar
      recursosEditables.forEach(r => {
        if (r.recurso_id && r.precio !== undefined && r.precio !== null) {
          precioSync.actualizarPrecio(r.recurso_id, r.precio, 'ModalAgregarSubPartida-guardar');
        }
      });
      
      onActualizarSubPartida(idSubPartidaEditando, subPartidaActualizada);
      handleClose();
      return;
    }

    // Si no se está editando, crear una nueva subpartida
    // Generar ID temporal
    const idTemporal = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear la nueva partida local con TODOS los datos guardados
    const nuevaSubPartida: PartidaLocal = {
      id_partida: idTemporal,
      id_presupuesto: id_presupuesto,
      id_proyecto: id_proyecto,
      id_titulo: partidaPadre.id_titulo,
      id_partida_padre: id_partida_padre,
      nivel_partida: partidaPadre.nivel_partida + 1,
      numero_item: '', // Se calculará en el padre
      descripcion: descripcionSubpartida || partidaSeleccionada.descripcion,
      unidad_medida: partidaSeleccionada.unidad_medida,
      metrado: 1, // Se editará en el panel
      precio_unitario: precioUnitario, // CU = costo directo del modal
      parcial_partida: precioUnitario, // Se recalculará en el panel cuando cambie el metrado
      orden: 0, // Se calculará en el padre
      estado: 'Activa',
      // Guardar TODOS los recursos con el ID de la partida original
      recursos: recursosEditables.map((r) => ({ 
        ...r,
        id_partida_original: partidaSeleccionada.id_partida, // Guardar el ID de la partida original para poder editarla después
      })),
      // Guardar también rendimiento y jornada para poder cargarlos después
      rendimiento: rendimiento,
      jornada: jornada,
      // Guardar el ID de la partida original directamente en la subpartida
      id_partida_original: partidaSeleccionada.id_partida,
    };

    // Actualizar precios en el contexto de sincronización antes de guardar
    recursosEditables.forEach(r => {
      if (r.recurso_id && r.precio !== undefined && r.precio !== null) {
        precioSync.actualizarPrecio(r.recurso_id, r.precio, 'ModalAgregarSubPartida-guardar');
      }
    });

    // Llamar al componente padre
    if (onAgregarSubPartida) {
      onAgregarSubPartida(nuevaSubPartida);
    }

    // Cerrar el modal
    handleClose();
  }, [partidaSeleccionada, id_partida_padre, id_presupuesto, id_proyecto, partidas, recursosEditables, totales, onAgregarSubPartida, rendimiento, jornada, idSubPartidaEditando, onActualizarSubPartida]);

  const handleClose = () => {
    setPartidaSeleccionada(null);
    setRecursosEditables([]);
    setRendimiento(1.0);
    setJornada(8);
    setRendimientoInput('1.0');
    setJornadaInput('8');
    setDescripcionSubpartida('');
    setHasChanges(false);
    setValoresOriginales(null);
    setIdSubPartidaEditando(null); // Limpiar el ID de subpartida editando
    onClose();
  };

  const getTipoRecursoColor = (tipo: string) => {
    switch (tipo) {
      case 'MATERIAL':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'MANO_OBRA':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'EQUIPO':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'SUBCONTRATO':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getTipoRecursoAbrev = (tipo: string) => {
    switch (tipo) {
      case 'MATERIAL':
        return 'MT';
      case 'MANO_OBRA':
        return 'MO';
      case 'EQUIPO':
        return 'EQ';
      case 'SUBCONTRATO':
        return 'SC';
      default:
        return 'OT';
    }
  };

  const hasPartida = !!partidaSeleccionada;
  const estaEditando = !!subPartidaParaEditar && !!idSubPartidaEditando;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        esModoLectura
          ? "Ver Sub Partida"
          : estaEditando
          ? "Editar Sub Partida"
          : "Agregar Sub Partida"
      }
      size="xl"
      footer={null}
    >
      <div className="h-full flex flex-col bg-[var(--background)] min-h-[420px] max-h-[56vh]">
        {/* Buscador de Partidas - Solo mostrar si no hay partida seleccionada y no es modo lectura */}
        {!hasPartida && !esModoLectura && (
          <div className="flex-shrink-0 px-2 py-1.5 border-b border-[var(--border-color)] bg-[var(--card-bg)]">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[var(--text-secondary)] whitespace-nowrap">Buscar Partida:</span>
              <div className="flex-1">
                <AutocompletePartida
                  onSelect={handleSelectPartida}
                  placeholder="Buscar por descripción, item o código..."
                  partidas={partidas}
                />
              </div>
            </div>
          </div>
        )}

        {/* HEADER FIJO - Datos de Partida y APU */}
        {hasPartida && (
          <div className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)] relative z-0 table-header-shadow">
            {/* Datos de Partida */}
            <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3 flex-wrap text-[10px]">
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[var(--text-secondary)] whitespace-nowrap">Partida:</span>
                  {!subPartidaParaEditar && !esModoLectura ? (
                    <Input
                      type="text"
                      value={descripcionSubpartida}
                      onChange={(e) => {
                        setDescripcionSubpartida(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Descripción de la subpartida"
                      className="text-[10px] h-6 flex-1 font-medium"
                    />
                  ) : (
                    <span className="ml-1 font-medium text-[var(--text-primary)]">
                      {subPartidaParaEditar ? partidaSeleccionada.descripcion : descripcionSubpartida || partidaSeleccionada.descripcion}
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-[var(--text-secondary)]">Item:</span>
                  <span className="ml-1 font-mono text-[var(--text-primary)]">
                    {partidaSeleccionada.numero_item}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">Unidad:</span>
                  <span className="ml-1 text-[var(--text-primary)]">
                    {partidaSeleccionada.unidad_medida}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">Metrado:</span>
                  <span className="ml-1 text-[var(--text-primary)]">
                    {partidaSeleccionada.metrado.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-[var(--text-secondary)]">Estado:</span>
                  <span
                    className={`ml-1 font-medium ${
                      partidaSeleccionada.estado === 'Activa' ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {partidaSeleccionada.estado}
                  </span>
                </div>
              </div>
            </div>

            {/* Datos de APU - Rendimiento y Jornada */}
            <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">Rendimiento:</span>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={rendimientoInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRendimientoInput(value);
                      if (value === '' || value === '-') {
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setRendimiento(truncateToFour(numValue));
                        if (valoresOriginales) {
                          setHasChanges(true);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setRendimientoInput('1.0000');
                        setRendimiento(1.0);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (isNaN(numValue) || numValue < 0) {
                        setRendimientoInput(rendimiento.toFixed(4));
                      } else {
                        const truncated = truncateToFour(numValue);
                        setRendimientoInput(truncated.toFixed(4));
                        setRendimiento(truncated);
                      }
                    }}
                    disabled={esModoLectura}
                    className="text-[10px] h-6 w-16 text-center px-1"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">Jornada:</span>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={jornadaInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setJornadaInput(value);
                      if (value === '' || value === '-') {
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setJornada(truncateToFour(numValue));
                        if (valoresOriginales) {
                          setHasChanges(true);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setJornadaInput('8.0000');
                        setJornada(8);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (isNaN(numValue) || numValue < 0) {
                        setJornadaInput(jornada.toFixed(4));
                      } else {
                        const truncated = truncateToFour(numValue);
                        setJornadaInput(truncated.toFixed(4));
                        setJornada(truncated);
                      }
                    }}
                    disabled={esModoLectura}
                    className="text-[10px] h-6 w-16 text-center px-1"
                  />
                  <span className="text-[8px] text-[var(--text-secondary)]">h</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Precio Unit.:</span>
                  <span className="ml-1 font-medium text-[var(--text-primary)]">
                    S/ {partidaSeleccionada.precio_unitario.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Costo Directo:</span>
                  <span className="ml-1 font-medium text-[var(--text-primary)]">
                    S/ {totales.costo_directo.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen de Costos */}
            <div className="px-2 py-1.5 table-header-shadow">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)]">Resumen:</span>
                <div className="flex gap-1.5">
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('MANO_OBRA')}`}
                  >
                    MO: S/ {totales.costo_mano_obra.toFixed(2)}
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('MATERIAL')}`}
                  >
                    MT: S/ {totales.costo_materiales.toFixed(2)}
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('EQUIPO')}`}
                  >
                    EQ: S/ {totales.costo_equipos.toFixed(2)}
                  </div>
                  {totales.costo_subcontratos > 0 && (
                    <div
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('SUBCONTRATO')}`}
                    >
                      SC: S/ {totales.costo_subcontratos.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUERPO CON SCROLL - Tabla de Recursos APU */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!hasPartida ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                Busque y seleccione una partida para ver sus recursos
              </p>
            </div>
          ) : isLoadingApu ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] text-[var(--text-secondary)]">Cargando...</div>
            </div>
          ) : (
            <div className="py-1">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-[var(--card-bg)] z-10 table-header-shadow">
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-1 py-1 text-left font-medium text-[var(--text-secondary)] uppercase w-[35%]">
                      Insumo
                    </th>
                    <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">
                      Und.
                    </th>
                    <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">
                      Cuad.
                    </th>
                    <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[12%]">
                      Cantidad
                    </th>
                    <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[12%]">
                      P.U.
                    </th>
                    <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[15%]">
                      Parcial
                    </th>
                    <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[10%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {recursosEditables.map((recurso) => {
                    const unidadMedidaLower = recurso.unidad_medida?.toLowerCase() || '';
                    const debeMostrarCuadrilla =
                      (recurso.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
                      (recurso.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');

                    return (
                      <tr
                        key={recurso.id_recurso_apu}
                        className="hover:bg-[var(--card-bg)]/50 transition-colors"
                      >
                        <td className="px-1 py-1">
                          {recurso.enEdicion && !recurso.recurso_id && !esModoLectura ? (
                            <AutocompleteRecurso
                              value={recurso.descripcion}
                              onSelect={(r: Recurso) =>
                                handleSeleccionarRecurso(recurso.id_recurso_apu, r)
                              }
                              placeholder="Buscar recurso..."
                              className="text-[10px]"
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              {recurso.tipo_recurso && (
                                <span
                                  className={`px-1 py-0.5 rounded text-[8px] font-medium ${getTipoRecursoColor(recurso.tipo_recurso)}`}
                                >
                                  {getTipoRecursoAbrev(recurso.tipo_recurso)}
                                </span>
                              )}
                              <span
                                className="text-[var(--text-primary)] truncate"
                                title={recurso.descripcion || ''}
                              >
                                {recurso.descripcion || '—'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <Input
                            type="text"
                            value={recurso.unidad_medida || ''}
                            onChange={(e) =>
                              handleUpdateRecurso(recurso.id_recurso_apu, 'unidad_medida', e.target.value)
                            }
                            disabled={esModoLectura}
                            className="text-[10px] h-6 w-full text-center px-1"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          {debeMostrarCuadrilla ? (
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={recurso.cuadrilla ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === '-') {
                                  handleUpdateRecurso(recurso.id_recurso_apu, 'cuadrilla', 0);
                                  return;
                                }
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  handleUpdateRecurso(recurso.id_recurso_apu, 'cuadrilla', numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === '-') {
                                  // Restaurar a 1 si está vacío (valor por defecto para cuadrilla)
                                  handleUpdateRecurso(recurso.id_recurso_apu, 'cuadrilla', 1);
                                  return;
                                }
                                const numValue = parseFloat(value);
                                if (isNaN(numValue) || numValue < 0) {
                                  // Restaurar a 1 si es inválido
                                  handleUpdateRecurso(recurso.id_recurso_apu, 'cuadrilla', 1);
                                }
                              }}
                              disabled={esModoLectura}
                              className="text-[10px] h-6 w-full text-center px-1"
                            />
                          ) : (
                            <span className="text-[10px] text-[var(--text-secondary)] italic"></span>
                          )}
                        </td>
                        <td className="px-1 py-1 text-right">
                          {(() => {
                            const esEquipoPorcentajeMo =
                              recurso.tipo_recurso === 'EQUIPO' &&
                              (recurso.unidad_medida === '%mo' ||
                                recurso.unidad_medida?.toLowerCase() === '%mo');
                            return (
                              <div className="relative inline-flex items-center justify-end w-full">
                                <Input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  value={recurso.cantidad ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '-') {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'cantidad', 0);
                                      return;
                                    }
                                    const numValue = parseFloat(value);
                                    if (!isNaN(numValue) && numValue >= 0) {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'cantidad', numValue);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '-') {
                                      // Restaurar a 0 si está vacío
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'cantidad', 0);
                                      return;
                                    }
                                    const numValue = parseFloat(value);
                                    if (isNaN(numValue) || numValue < 0) {
                                      // Restaurar a 0 si es inválido
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'cantidad', 0);
                                    }
                                  }}
                                  disabled={esModoLectura}
                                  className={`text-[10px] h-6 w-full text-right ${esEquipoPorcentajeMo ? 'pr-4' : 'px-1'}`}
                                />
                                {esEquipoPorcentajeMo && (
                                  <span className="absolute right-2 text-[9px] text-[var(--text-secondary)] pointer-events-none">
                                    %
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-1 py-1 text-right">
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={recurso.precio ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || value === '-') {
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', 0);
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                const roundedValue = roundToTwo(numValue);
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', roundedValue);
                              } else {
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', recurso.precio || 0);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value === '' || value === '-') {
                                // Restaurar a 0 si está vacío
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', 0);
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (isNaN(numValue) || numValue < 0) {
                                // Restaurar a 0 si es inválido
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', 0);
                              }
                            }}
                            onKeyDown={(e) => {
                              const key = e.key;
                              const currentValue = e.currentTarget.value;
                              const parts = currentValue.split('.');
                              const hasDecimal = parts.length > 1;
                              const decimalsCount = hasDecimal ? parts[1].length : 0;

                              const isNumber = /^\d$/.test(key);
                              const isDecimal = key === '.' && !hasDecimal;
                              const isControl = [
                                'Backspace',
                                'Delete',
                                'Tab',
                                'Escape',
                                'Enter',
                                'ArrowLeft',
                                'ArrowRight',
                                'ArrowUp',
                                'ArrowDown',
                                'Home',
                                'End',
                              ].includes(key);
                              const isPaste = (e.ctrlKey || e.metaKey) && key === 'v';

                              if (hasDecimal && decimalsCount >= 2 && isNumber && !isControl) {
                                e.preventDefault();
                                return;
                              }

                              if (!isNumber && !isDecimal && !isControl && !isPaste) {
                                e.preventDefault();
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text');
                              const numValue = parseFloat(pastedText);
                              if (!isNaN(numValue) && numValue >= 0) {
                                const roundedValue = roundToTwo(numValue);
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', roundedValue);
                              }
                            }}
                            className="text-[10px] h-6 w-full text-right px-1"
                            title="Precio unitario (máximo 2 decimales)"
                            disabled={
                              esModoLectura ||
                              (recurso.tipo_recurso === 'EQUIPO' &&
                                (recurso.unidad_medida === '%mo' ||
                                  recurso.unidad_medida?.toLowerCase() === '%mo'))
                            }
                          />
                        </td>
                        <td className="px-1 py-1 text-right font-medium text-[var(--text-primary)]">
                          <span>
                            S/{' '}
                            {recurso.parcial !== undefined && recurso.parcial !== null
                              ? roundToTwo(recurso.parcial).toFixed(2)
                              : '0.00'}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-center">
                          {!esModoLectura && (
                            <button
                              onClick={() => handleEliminarRecurso(recurso.id_recurso_apu)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-0.5 transition-colors"
                              title="Eliminar recurso"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {recursosEditables.length === 0 && !isLoadingApu && (
                <div className="text-center py-4">
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    No hay recursos asignados. Haga clic en "Agregar Insumo" para comenzar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER FIJO - Botones de Acción */}
        {hasPartida && !esModoLectura && (
          <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--card-bg)] px-2 py-1.5 card-shadow">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAgregarInsumo}
                disabled={isLoadingApu}
                className="flex items-center gap-1 h-6 px-2 text-[10px]"
              >
                <Plus className="h-3 w-3" />
                Agregar Insumo
              </Button>
              <div className="flex-1" />
              {estaEditando && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelarCambios}
                  disabled={!hasChanges || !valoresOriginales}
                  className="flex items-center gap-1 h-6 px-2 text-[10px] border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  title="Cancelar cambios y restaurar valores originales"
                >
                  <X className="h-3 w-3" />
                  Cancelar
                </Button>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={handleAgregarSubPartida}
                disabled={
                  estaEditando
                    ? (!partidaSeleccionada || !id_partida_padre || recursosEditables.length === 0)
                    : (!partidaSeleccionada || !id_partida_padre || recursosEditables.length === 0)
                }
                className="flex items-center gap-1 h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                title={
                  !partidaSeleccionada
                    ? 'Seleccione una partida'
                    : !id_partida_padre
                    ? 'No hay partida padre seleccionada'
                    : recursosEditables.length === 0
                    ? 'Debe agregar al menos un recurso'
                    : estaEditando
                    ? 'Actualizar sub partida'
                    : 'Agregar sub partida'
                }
              >
                {estaEditando ? (
                  <>
                    <Plus className="h-3 w-3" />
                    Actualizar Sub Partida
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Agregar Sub Partida
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
