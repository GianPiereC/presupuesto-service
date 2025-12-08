'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AutocompleteRecurso from './AutocompleteRecurso';
import { Recurso } from '@/hooks/useRecursos';
import {
  useApuByPartida,
  useCreateApu,
  useUpdateApu,
  useAddRecursoToApu,
  useUpdateRecursoInApu,
  useRemoveRecursoFromApu,
  type RecursoApuInput,
  type TipoRecursoApu,
} from '@/hooks/useAPU';
import { useUpdatePartida } from '@/hooks/usePartidas';
import { mapearTipoCostoRecursoATipoApu } from '@/utils/tipoRecursoMapper';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import { GET_PRECIO_RECURSO_BY_PRESUPUESTO_Y_RECURSO, GET_APU_BY_PARTIDA_QUERY } from '@/graphql/queries';
import { GET_ESTRUCTURA_PRESUPUESTO_QUERY } from '@/graphql/queries/presupuesto.queries';

const GET_PARTIDA_QUERY = `
  query GetPartida($id_partida: String!) {
    getPartida(id_partida: $id_partida) {
      id_partida
      id_partida_padre
      id_titulo
      nivel_partida
      descripcion
      unidad_medida
      metrado
      precio_unitario
      parcial_partida
    }
  }
`;
import {
  ADD_RECURSO_TO_APU_MUTATION,
  UPDATE_RECURSO_IN_APU_MUTATION,
  REMOVE_RECURSO_FROM_APU_MUTATION,
  UPDATE_APU_MUTATION,
  CREAR_PARTIDAS_SUBPARTIDAS_Y_APUS_MUTATION,
  DELETE_APU_MUTATION,
} from '@/graphql/mutations/apu.mutations';
import { DELETE_PARTIDA_MUTATION } from '@/graphql/mutations/partida.mutations';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Partida {
  id_partida: string;
  descripcion: string;
  numero_item: string;
  unidad_medida: string;
  estado: 'Activa' | 'Inactiva';
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
  id_presupuesto: string;
  id_proyecto?: string;
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
  esSubpartida?: boolean;
  id_partida_subpartida?: string;
  id_partida_original?: string; // ID de la partida original que se usó para crear la subpartida
  precio_unitario_subpartida?: number;
  recursosSubpartida?: RecursoAPUEditable[];
  rendimientoSubpartida?: number;
  jornadaSubpartida?: number;
  tiene_precio_override?: boolean;
  precio_override?: number;
}

export interface PartidaLocal {
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

interface DetallePartidaPanelProps {
  id_partida: string | null;
  id_presupuesto?: string;
  id_proyecto?: string;
  partida?: Partida | null;
  onAgregarInsumo?: () => void;
  onAgregarSubPartida?: () => void;
  onGuardarCambios?: () => void;
  onGuardandoCambios?: (isGuardando: boolean) => void;
  modo?: 'edicion' | 'lectura' | 'meta' | 'licitacion' | 'contractual';
  onEditarSubPartida?: (idPartidaSubpartida: string, recursos: RecursoAPUEditable[], idPartidaOriginal?: string, rendimiento?: number, jornada?: number, descripcion?: string) => void;
  onActualizarSubPartida?: (idSubPartida: string, subPartida: PartidaLocal) => void;
  subpartidasPendientes?: PartidaLocal[];
  onLimpiarSubpartidasPendientes?: () => void;
  subPartidaParaActualizar?: PartidaLocal | null;
  onLimpiarSubPartidaParaActualizar?: () => void;
  onEliminarSubPartida?: (idPartidaSubpartida: string) => void;
}

export default function DetallePartidaPanel({
  id_partida,
  id_presupuesto,
  id_proyecto,
  partida,
  onAgregarInsumo,
  onAgregarSubPartida,
  onGuardarCambios,
  onGuardandoCambios,
  modo = 'edicion',
  onEditarSubPartida,
  onActualizarSubPartida,
  subpartidasPendientes,
  onLimpiarSubpartidasPendientes,
  subPartidaParaActualizar,
  onLimpiarSubPartidaParaActualizar,
  onEliminarSubPartida,
}: DetallePartidaPanelProps) {
  // Convertir modos especiales a 'lectura' si no son 'edicion'
  const modoReal = modo === 'edicion' ? 'edicion' : 'lectura';
  const esPartidaNoGuardada = id_partida?.startsWith('temp_') ?? false;

  const queryClient = useQueryClient();
  const { data: apuData, isLoading: isLoadingApu, refetch: refetchApu } = useApuByPartida(
    esPartidaNoGuardada ? null : id_partida
  );

  const createApu = useCreateApu();
  const updateApu = useUpdateApu();
  const addRecursoToApu = useAddRecursoToApu();
  const updateRecursoInApu = useUpdateRecursoInApu();
  const removeRecursoFromApu = useRemoveRecursoFromApu();
  const updatePartida = useUpdatePartida();

  const [recursosEditables, setRecursosEditables] = useState<RecursoAPUEditable[]>([]);
  const [rendimiento, setRendimiento] = useState<number>(1.0);
  const [jornada, setJornada] = useState<number>(8);
  const [rendimientoInput, setRendimientoInput] = useState<string>('1.0');
  const [jornadaInput, setJornadaInput] = useState<string>('8');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para editar metrado y unidad de medida de la partida
  const [metradoInput, setMetradoInput] = useState<string>('0');
  const [unidadMedidaInput, setUnidadMedidaInput] = useState<string>('');
  const [hasPartidaChanges, setHasPartidaChanges] = useState(false);

  // Guardar valores originales para poder cancelar
  const [valoresOriginales, setValoresOriginales] = useState<{
    rendimiento: number;
    jornada: number;
    recursos: RecursoAPUEditable[];
  } | null>(null);

  useEffect(() => {
    if (apuData) {
      const nuevoRendimiento = apuData.rendimiento || 1.0;
      const nuevaJornada = apuData.jornada || 8;
      setRendimiento(nuevoRendimiento);
      setJornada(nuevaJornada);
      setRendimientoInput(String(nuevoRendimiento));
      setJornadaInput(String(nuevaJornada));
      // Cargar recursos con subpartidas
      const cargarRecursosConSubpartidas = async () => {
        const recursosEditablePromises = apuData.recursos.map(async (r: any, index) => {
          // Detectar si es subpartida - verificar que id_partida_subpartida existe y no es vacío o null
          // También verificar que no tenga recurso_id (las subpartidas no tienen recurso_id)
          // O que tenga precio_unitario_subpartida (indicador adicional de subpartida)
          const tieneIdSubpartida = !!(r.id_partida_subpartida && typeof r.id_partida_subpartida === 'string' && r.id_partida_subpartida.trim() !== '');
          const noTieneRecursoId = !r.recurso_id || r.recurso_id.trim() === '';
          const tienePrecioUnitarioSubpartida = r.precio_unitario_subpartida !== undefined && r.precio_unitario_subpartida !== null;

          const esSubpartida = tieneIdSubpartida || (noTieneRecursoId && tienePrecioUnitarioSubpartida);

          // Para subpartidas, usar precio_unitario_subpartida como precio
          const precioFinal = esSubpartida && r.precio_unitario_subpartida !== undefined
            ? r.precio_unitario_subpartida
            : (r.precio || 0);

          const recursoBase: RecursoAPUEditable = {
            id_recurso_apu: r.id_recurso_apu,
            recurso_id: r.recurso_id || '',
            codigo_recurso: r.codigo_recurso || '',
            descripcion: r.descripcion,
            tipo_recurso: r.tipo_recurso,
            unidad_medida: r.unidad_medida,
            id_precio_recurso: r.id_precio_recurso,
            precio: precioFinal,
            cuadrilla: r.cuadrilla,
            cantidad: r.cantidad,
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            parcial: 0, // Se calculará después con calcularParcial
            orden: r.orden,
            enEdicion: false,
            esNuevo: false,
            esSubpartida: esSubpartida,
            id_partida_subpartida: r.id_partida_subpartida || undefined,
            precio_unitario_subpartida: r.precio_unitario_subpartida,
            recursosSubpartida: [],
            rendimientoSubpartida: undefined,
            jornadaSubpartida: undefined,
            tiene_precio_override: r.tiene_precio_override || false,
            precio_override: r.precio_override,
          };


          // Calcular parcial después de crear el objeto completo
          recursoBase.parcial = calcularParcial(recursoBase);

          // Si es subpartida, cargar su APU para obtener recursos, rendimiento y jornada
          if (esSubpartida && r.id_partida_subpartida) {
            try {
              const subpartidaApuResponse = await executeQuery<{ getApuByPartida: any }>(
                GET_APU_BY_PARTIDA_QUERY,
                { id_partida: r.id_partida_subpartida }
              );

              if (subpartidaApuResponse?.getApuByPartida) {
                const subpartidaApu = subpartidaApuResponse.getApuByPartida;

                // Convertir recursos del APU de la subpartida a RecursoAPUEditable
                const recursosSubpartida: RecursoAPUEditable[] = (subpartidaApu.recursos || []).map((sr: any) => {
                  const recursoSub: RecursoAPUEditable = {
                    id_recurso_apu: sr.id_recurso_apu,
                    recurso_id: sr.recurso_id || '',
                    codigo_recurso: sr.codigo_recurso || '',
                    descripcion: sr.descripcion,
                    tipo_recurso: sr.tipo_recurso,
                    unidad_medida: sr.unidad_medida,
                    id_precio_recurso: sr.id_precio_recurso,
                    precio: sr.precio || 0,
                    cuadrilla: sr.cuadrilla,
                    cantidad: sr.cantidad,
                    desperdicio_porcentaje: sr.desperdicio_porcentaje || 0,
                    parcial: 0, // Se calculará después
                    orden: sr.orden,
                    enEdicion: false,
                    esNuevo: false,
                    esSubpartida: false,
                    tiene_precio_override: sr.tiene_precio_override || false,
                    precio_override: sr.precio_override,
                  };

                  // Calcular parcial después de crear el objeto completo
                  recursoSub.parcial = calcularParcial(recursoSub);
                  return recursoSub;
                });

                recursoBase.recursosSubpartida = recursosSubpartida;
                recursoBase.rendimientoSubpartida = subpartidaApu.rendimiento || 1.0;
                recursoBase.jornadaSubpartida = subpartidaApu.jornada || 8;

                // Obtener la partida subpartida para obtener su id_partida_padre (que es el id_partida_original)
                try {
                  const partidaSubpartidaResponse = await executeQuery<{ getPartida: any }>(
                    GET_PARTIDA_QUERY,
                    { id_partida: r.id_partida_subpartida }
                  );

                  if (partidaSubpartidaResponse?.getPartida) {
                    const partidaSubpartida = partidaSubpartidaResponse.getPartida;
                    // El id_partida_original es el id_partida_padre de la partida subpartida
                    recursoBase.id_partida_original = partidaSubpartida.id_partida_padre || id_partida || undefined;
                    // Usar la descripción de la partida subpartida (que es la descripción editada guardada)
                    if (partidaSubpartida.descripcion) {
                      recursoBase.descripcion = partidaSubpartida.descripcion;
                    }
                  } else {
                    // Si no se encuentra, usar el id_partida actual como referencia
                    recursoBase.id_partida_original = id_partida || undefined;
                  }
                } catch (error) {
                  // Si hay error, usar el id_partida actual como referencia
                  recursoBase.id_partida_original = id_partida || undefined;
                }
              }
            } catch (error) {
              // Error silencioso al cargar APU de subpartida
            }
          }

          return recursoBase;
        });

        const recursosEditable = await Promise.all(recursosEditablePromises);
        setRecursosEditables(recursosEditable);

        // Guardar valores originales
        setValoresOriginales({
          rendimiento: nuevoRendimiento,
          jornada: nuevaJornada,
          recursos: JSON.parse(JSON.stringify(recursosEditable))
        });
        setHasChanges(false);
      };

      cargarRecursosConSubpartidas();
    } else if (id_partida && !isLoadingApu) {
      setRecursosEditables([]);
      setRendimiento(1.0);
      setJornada(8);
      setRendimientoInput('1.0');
      setJornadaInput('8');
      setValoresOriginales({
        rendimiento: 1.0,
        jornada: 8,
        recursos: []
      });
      setHasChanges(false);
    }
  }, [apuData, id_partida, isLoadingApu]);

  // Inicializar metrado y unidad_medida cuando cambia la partida
  useEffect(() => {
    if (partida) {
      setMetradoInput(String(partida.metrado));
      setUnidadMedidaInput(partida.unidad_medida);
      setHasPartidaChanges(false);
    } else {
      setMetradoInput('0');
      setUnidadMedidaInput('');
      setHasPartidaChanges(false);
    }
  }, [partida]);

  // Inicializar precios en el contexto después del render (evitar error de React)
  useEffect(() => {
    if (recursosEditables.length === 0) return;

    // Inicializar precios de recursos normales
    recursosEditables.forEach(r => {
      // Excluir recursos con precio calculado (%MO)
      const esEquipoConPorcentajeMo = r.tipo_recurso === 'EQUIPO' && (r.unidad_medida === '%mo' || r.unidad_medida?.toLowerCase() === '%mo');
      if (r.recurso_id && r.precio !== undefined && r.precio !== null && !esEquipoConPorcentajeMo) {
        // TODO: Aquí debería inicializar precio en el contexto si existe
        // precioSync.actualizarPrecio(r.recurso_id, r.precio, 'DetallePartidaPanel-carga');
      }
    });

    // También inicializar precios de recursos dentro de subpartidas
    recursosEditables.forEach(r => {
      if (r.recursosSubpartida) {
        r.recursosSubpartida.forEach(sr => {
          // Excluir recursos con precio calculado (%MO)
          const esEquipoConPorcentajeMoSub = sr.tipo_recurso === 'EQUIPO' && (sr.unidad_medida === '%mo' || sr.unidad_medida?.toLowerCase() === '%mo');
          if (sr.recurso_id && sr.precio !== undefined && sr.precio !== null && !esEquipoConPorcentajeMoSub) {
            // TODO: Aquí debería inicializar precio en el contexto si existe
            // precioSync.actualizarPrecio(sr.recurso_id, sr.precio, 'DetallePartidaPanel-carga-subpartida');
          }
        });
      }
    });
  }, [recursosEditables]);

  // Función helper para truncar a 4 decimales (para cuadrilla y cantidad)
  const truncateToFour = (num: number): number => {
    return Math.round(num * 10000) / 10000;
  };

  // Función helper para redondear a 2 decimales (para PU y parciales)
  const roundToTwo = (num: number): number => {
    return Math.round(num * 100) / 100;
  };

  // Función para calcular cantidad desde cuadrilla (fórmula: cantidad = (jornada * cuadrilla) / rendimiento)
  const calcularCantidadDesdeCuadrilla = (cuadrilla: number): number => {
    if (!rendimiento || rendimiento <= 0) return 0;
    return truncateToFour((jornada * cuadrilla) / rendimiento);
  };

  // Función para calcular cuadrilla desde cantidad (fórmula: cuadrilla = (cantidad * rendimiento) / jornada)
  const calcularCuadrillaDesdeCantidad = (cantidad: number): number => {
    if (!jornada || jornada <= 0) return 0;
    return truncateToFour((cantidad * rendimiento) / jornada);
  };

  // Función para calcular precio desde parcial (para MANO_OBRA)
  const calcularPrecioDesdeParcial = (parcial: number): number => {
    if (!rendimiento || rendimiento <= 0 || !jornada || jornada <= 0) return 0;
    // Parcial_MO = (1 / Rendimiento) × Jornada × Precio_Hora
    // Despejando: Precio_Hora = Parcial_MO / ((1 / Rendimiento) × Jornada)
    const divisor = (1 / rendimiento) * jornada;
    if (divisor === 0) return 0;
    return truncateToFour(parcial / divisor);
  };

  // Función helper para calcular la suma de parciales de MO con unidad "hh"
  const calcularSumaParcialesManoObra = useCallback((): number => {
    return recursosEditables
      .filter(r => r.tipo_recurso === 'MANO_OBRA' && r.unidad_medida?.toLowerCase() === 'hh')
      .reduce((suma, r) => {
        // Calcular el parcial de cada recurso de MO con unidad "hh"
        if (!rendimiento || rendimiento <= 0) return suma;
        if (!jornada || jornada <= 0) return suma;
        const cuadrillaValue = r.cuadrilla || 1;
        const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
        return suma + parcialMO;
      }, 0);
  }, [recursosEditables, rendimiento, jornada]);

  const calcularParcial = (recurso: RecursoAPUEditable): number => {
    // Si es una subpartida, el parcial es cantidad × precio_unitario_subpartida
    if (recurso.esSubpartida && recurso.precio_unitario_subpartida !== undefined) {
      return roundToTwo(recurso.cantidad * recurso.precio_unitario_subpartida);
    }

    const { tipo_recurso, cantidad, precio, cuadrilla, desperdicio_porcentaje, unidad_medida } = recurso;

    switch (tipo_recurso) {
      case 'MATERIAL':
        const cantidadConDesperdicio = cantidad * (1 + (desperdicio_porcentaje || 0) / 100);
        return roundToTwo(cantidadConDesperdicio * precio);

      case 'MANO_OBRA': {
        // Fórmula correcta para MANO DE OBRA:
        // Parcial_MO = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
        // O también: Parcial_MO = Cantidad × Precio_Hora (donde Cantidad = (Jornada × Cuadrilla) / Rendimiento)
        if (!rendimiento || rendimiento <= 0) return 0;
        if (!jornada || jornada <= 0) return 0;

        const cuadrillaValue = cuadrilla || 1;
        // Parcial_MO = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
        return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
      }

      case 'EQUIPO':
        // Si la unidad es "%mo", calcular basándose en la sumatoria de HH de MO con unidad "hh"
        if (unidad_medida === '%mo' || unidad_medida?.toLowerCase() === '%mo') {
          // Sumar todos los parciales de MO con unidad "hh"
          const sumaHHManoObra = calcularSumaParcialesManoObra();

          // Aplicar el porcentaje: sumaHH * (cantidad / 100)
          return roundToTwo(sumaHHManoObra * (cantidad / 100));
        }

        // Si la unidad es "hm" (horas hombre), usar cálculo con cuadrilla (similar a MANO_OBRA)
        if (unidad_medida === 'hm' || unidad_medida?.toLowerCase() === 'hm') {
          if (!rendimiento || rendimiento <= 0) return 0;
          if (!jornada || jornada <= 0) return 0;

          const cuadrillaValue = cuadrilla || 1;
          // Parcial = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
          return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
        }

        // Para otras unidades: cálculo simple cantidad × precio
        return roundToTwo(cantidad * precio);

      case 'SUBCONTRATO':
        return roundToTwo(cantidad * precio);

      default:
        return roundToTwo(cantidad * precio);
    }
  };

  const hasPartida = id_partida && partida;

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
      tiene_precio_override: false,
      precio_override: undefined,
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
            recurso_id: recurso.id
          }
        );

        if (response.getPrecioRecursoByPresupuestoYRecurso) {
          precioInicial = response.getPrecioRecursoByPresupuestoYRecurso.precio;
          id_precio_recurso_existente = response.getPrecioRecursoByPresupuestoYRecurso.id_precio_recurso;
        }
      } catch (error) {
        // Usar precio del catálogo si hay error
      }
    }

    setRecursosEditables(prev => {
      // Calcular suma de parciales de MANO_OBRA para equipos con unidad "%mo"
      const sumaHHManoObra = prev
        .filter(r => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      return prev.map(r => {
        if (r.id_recurso_apu === recursoId) {
          const unidadMedida = recurso.unidad?.nombre || '';
          // Si es EQUIPO con unidad "%mo", usar suma de parciales de MO con "hh" como precio
          const precioFinal = (tipoRecurso === 'EQUIPO' && (unidadMedida === '%mo' || unidadMedida?.toLowerCase() === '%mo'))
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
            parcial: calcularParcial({
              ...r,
              precio: precioFinal,
              unidad_medida: unidadMedida,
              tipo_recurso: tipoRecurso,
            }),
            enEdicion: false,
          };

          return nuevoRecurso;
        }
        return r;
      }).map(r => ({
        ...r,
        parcial: calcularParcial(r) // Recalcular todos los parciales
      }));
    });
    setHasChanges(true);
  };

  const handleUpdateRecurso = (recursoId: string, campo: keyof RecursoAPUEditable, valor: string | number | boolean | null | undefined) => {
    setRecursosEditables(prev => {
      // Calcular suma de parciales de MANO_OBRA para actualizar precio de equipos con unidad "%mo"
      const sumaHHManoObra = prev
        .filter(r => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      return prev.map(r => {
        if (r.id_recurso_apu === recursoId) {
          const numValor = typeof valor === 'string' ? parseFloat(valor) || 0 : (typeof valor === 'number' ? valor : 0);
          const nuevoRecurso = { ...r };

          // Manejar campos especiales primero
          if (campo === 'tiene_precio_override' || campo === 'precio_override') {
            if (campo === 'tiene_precio_override') {
              nuevoRecurso.tiene_precio_override = valor === true;
              // Si se activa, copiar el precio actual a precio_override
              if (valor === true) {
                nuevoRecurso.precio_override = nuevoRecurso.precio || 0;
              } else {
                // Si se desactiva, limpiar precio_override
                nuevoRecurso.precio_override = undefined;
              }
            } else if (campo === 'precio_override') {
              nuevoRecurso.precio_override = typeof valor === 'number' ? roundToTwo(valor) : undefined;
            }
            return nuevoRecurso;
          }

          // Sincronización de campos según el tipo de recurso
          const unidadMedidaLower = r.unidad_medida?.toLowerCase() || '';
          const esManoObraConHh = r.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh';
          const esEquipoConHm = r.tipo_recurso === 'EQUIPO' && (unidadMedidaLower === 'hm');
          const esEquipoConPorcentajeMo = r.tipo_recurso === 'EQUIPO' && (unidadMedidaLower === '%mo');

          if (esManoObraConHh || esEquipoConHm) {
            // Para MO con "hh" y EQUIPO con "hm": sincronizar cantidad ↔ cuadrilla
            // Fórmula: cantidad = (jornada * cuadrilla) / rendimiento

            if (campo === 'cuadrilla') {
              // Si editas cuadrilla → recalcular cantidad
              nuevoRecurso.cuadrilla = truncateToFour(numValor);
              nuevoRecurso.cantidad = calcularCantidadDesdeCuadrilla(nuevoRecurso.cuadrilla);
            } else if (campo === 'cantidad') {
              // Si editas cantidad → recalcular cuadrilla
              nuevoRecurso.cantidad = truncateToFour(numValor);
              nuevoRecurso.cuadrilla = calcularCuadrillaDesdeCantidad(nuevoRecurso.cantidad);
            } else if (campo === 'precio') {
              nuevoRecurso.precio = roundToTwo(numValor);
            } else if (campo === 'desperdicio_porcentaje') {
              nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
            } else {
              (nuevoRecurso as any)[campo] = numValor;
            }
          } else if (esEquipoConPorcentajeMo) {
            // Para EQUIPO con unidad "%mo": solo actualizar cantidad (precio se calcula automáticamente)
            if (campo === 'cantidad') {
              nuevoRecurso.cantidad = truncateToFour(numValor);
            } else if (campo === 'precio') {
              // No permitir editar precio manualmente para equipos con unidad "%mo"
              // El precio se calcula automáticamente como suma de parciales de MANO_OBRA
              return r; // No hacer cambios si intentan editar el precio
            } else if (campo === 'desperdicio_porcentaje') {
              nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
            } else {
              (nuevoRecurso as any)[campo] = numValor;
            }
            // Actualizar precio automáticamente (suma de parciales de MANO_OBRA) - redondear a 2 decimales
            nuevoRecurso.precio = roundToTwo(sumaHHManoObra);
          } else if (r.tipo_recurso === 'EQUIPO') {
            // Para EQUIPO con otras unidades (excepto "%mo" y "hm"): solo cantidad y precio (sin cuadrilla)
            if (campo === 'cantidad') {
              nuevoRecurso.cantidad = truncateToFour(numValor);
            } else if (campo === 'precio') {
              nuevoRecurso.precio = roundToTwo(numValor);
              // Si tiene override activado, actualizar también precio_override
              if (nuevoRecurso.tiene_precio_override) {
                nuevoRecurso.precio_override = roundToTwo(numValor);
              }
            } else if (campo === 'desperdicio_porcentaje') {
              nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
            } else {
              (nuevoRecurso as any)[campo] = numValor;
            }
          } else {
            // Para MATERIAL y SUBCONTRATO: lógica normal (sin sincronización cantidad-cuadrilla)
            if (campo === 'cantidad') {
              nuevoRecurso.cantidad = truncateToFour(numValor);
              // Para subpartidas, recalcular precio cuando cambia la cantidad
              if (r.esSubpartida && r.precio_unitario_subpartida) {
                nuevoRecurso.precio = roundToTwo(nuevoRecurso.cantidad * r.precio_unitario_subpartida);
              }
            } else if (campo === 'precio') {
              // Para subpartidas, no permitir editar precio manualmente
              if (r.esSubpartida) {
                return r; // No hacer cambios
              }
              nuevoRecurso.precio = roundToTwo(numValor);
              // Si tiene override activado, actualizar también precio_override
              if (nuevoRecurso.tiene_precio_override) {
                nuevoRecurso.precio_override = roundToTwo(numValor);
              }
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

        // Si es EQUIPO con unidad "%mo" (aunque no sea el recurso editado), actualizar precio automáticamente
        if (r.tipo_recurso === 'EQUIPO' && (r.unidad_medida === '%mo' || r.unidad_medida?.toLowerCase() === '%mo')) {
          return {
            ...r,
            precio: roundToTwo(sumaHHManoObra)
          };
        }

        return r;
      }).map(r => ({
        ...r,
        parcial: calcularParcial(r) // Recalcular todos los parciales (importante para equipos con unidad "%mo" que dependen de MANO_OBRA)
      }));
    });
    setHasChanges(true);
  };

  // Recalcular parciales y sincronizar cantidad-cuadrilla cuando cambian rendimiento o jornada
  // También actualizar precio automático para equipos con unidad "%mo"
  useEffect(() => {
    if (recursosEditables.length > 0 && rendimiento > 0 && jornada > 0) {
      // Calcular suma de parciales de MANO_OBRA directamente (sin usar el callback para evitar bucle)
      const sumaHHManoObra = recursosEditables
        .filter(r => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => {
          if (!rendimiento || rendimiento <= 0) return suma;
          if (!jornada || jornada <= 0) return suma;
          const cuadrillaValue = r.cuadrilla || 1;
          const parcialMO = (1 / rendimiento) * jornada * cuadrillaValue * (r.precio || 0);
          return suma + parcialMO;
        }, 0);

      setRecursosEditables(prev => prev.map(r => {
        const nuevoRecurso = { ...r };

        // Si es EQUIPO con unidad "%mo", actualizar precio automáticamente (suma de parciales de MO con "hh")
        if (r.tipo_recurso === 'EQUIPO' && (r.unidad_medida === '%mo' || r.unidad_medida?.toLowerCase() === '%mo')) {
          nuevoRecurso.precio = roundToTwo(sumaHHManoObra);
        }

        // Si tiene cuadrilla (MO con "hh" o EQUIPO con "hm"), recalcular cantidad desde cuadrilla
        const unidadMedidaLower = r.unidad_medida?.toLowerCase() || '';
        const debeSincronizarCuadrilla = (r.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
          (r.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');

        if (debeSincronizarCuadrilla && r.cuadrilla) {
          nuevoRecurso.cantidad = calcularCantidadDesdeCuadrilla(r.cuadrilla);
        }

        // Recalcular parcial
        nuevoRecurso.parcial = calcularParcial(nuevoRecurso);

        return nuevoRecurso;
      }));
      // Solo marcar como cambios si ya se cargaron los valores originales
      if (valoresOriginales && recursosEditables.length > 0) {
        setHasChanges(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendimiento, jornada]);

  const handleEliminarRecurso = (recursoId: string) => {
    // Verificar si el recurso que se va a eliminar es una subpartida
    const recursoAEliminar = recursosEditables.find(r => r.id_recurso_apu === recursoId);

    // Solo quitar el recurso localmente, no eliminar del backend
    // Se eliminará realmente cuando se pulse "Guardar Cambios"
    setRecursosEditables(prev => prev.filter(r => r.id_recurso_apu !== recursoId));

    // Si es una subpartida, también eliminarla del estado del padre
    if (recursoAEliminar?.esSubpartida && recursoAEliminar.id_partida_subpartida && onEliminarSubPartida) {
      onEliminarSubPartida(recursoAEliminar.id_partida_subpartida);
    }

    setHasChanges(true);
  };

  const handleCancelarCambios = () => {
    if (!valoresOriginales) return;

    // Restaurar valores originales
    setRendimiento(valoresOriginales.rendimiento);
    setJornada(valoresOriginales.jornada);
    setRendimientoInput(String(valoresOriginales.rendimiento));
    setJornadaInput(String(valoresOriginales.jornada));
    setRecursosEditables(JSON.parse(JSON.stringify(valoresOriginales.recursos)));
    setHasChanges(false);
    toast.success('Cambios cancelados');
  };

  // Función para agregar subpartida como recurso
  const handleAgregarSubPartidaComoRecurso = useCallback((subPartida: PartidaLocal) => {
    const nuevoId = `subpartida-${Date.now()}`;
    const nuevaFila: RecursoAPUEditable = {
      id_recurso_apu: nuevoId,
      recurso_id: '',
      codigo_recurso: '',
      descripcion: subPartida.descripcion,
      tipo_recurso: 'MATERIAL', // Tipo por defecto, no se usa para subpartidas
      unidad_medida: subPartida.unidad_medida,
      id_precio_recurso: null,
      precio: subPartida.metrado * subPartida.precio_unitario, // cantidad × PU
      cuadrilla: undefined, // No se usa para subpartidas
      cantidad: subPartida.metrado, // Usar el metrado como cantidad inicial
      desperdicio_porcentaje: undefined,
      parcial: roundToTwo(subPartida.metrado * subPartida.precio_unitario), // Parcial = cantidad × precio_unitario_subpartida
      orden: recursosEditables.length,
      enEdicion: false,
      esNuevo: true,
      esSubpartida: true,
      id_partida_subpartida: subPartida.id_partida,
      // Usar id_partida_original directamente de la subpartida, o extraerlo de los recursos como fallback
      id_partida_original: subPartida.id_partida_original ||
        (subPartida.recursos && subPartida.recursos.length > 0
          ? (subPartida.recursos[0] as any).id_partida_original || null
          : null), // ID de la partida original usada para crear la subpartida
      precio_unitario_subpartida: subPartida.precio_unitario,
      // Guardar TODOS los datos de la subpartida para poder editarlos después
      recursosSubpartida: subPartida.recursos || [],
      // Guardar rendimiento y jornada si existen
      rendimientoSubpartida: subPartida.rendimiento,
      jornadaSubpartida: subPartida.jornada,
      tiene_precio_override: false, // Las subpartidas no usan override
      precio_override: undefined,
    };
    setRecursosEditables([...recursosEditables, nuevaFila]);
    setHasChanges(true);
  }, [recursosEditables]);

  // Efecto para agregar subpartidas pendientes
  useEffect(() => {
    if (subpartidasPendientes && subpartidasPendientes.length > 0) {
      // Procesar cada subpartida pendiente
      subpartidasPendientes.forEach(subPartida => {
        // Verificar si ya existe una subpartida con el mismo ID
        const subpartidaExistente = recursosEditables.find(
          r => r.esSubpartida && r.id_partida_subpartida === subPartida.id_partida
        );

        if (!subpartidaExistente) {
          // Agregar nueva subpartida
          handleAgregarSubPartidaComoRecurso(subPartida);
        }
      });

      // Limpiar las subpartidas pendientes después de procesarlas
      if (onLimpiarSubpartidasPendientes) {
        setTimeout(() => onLimpiarSubpartidasPendientes(), 0);
      }
    }
  }, [subpartidasPendientes, handleAgregarSubPartidaComoRecurso, recursosEditables, onLimpiarSubpartidasPendientes]);

  // Efecto para actualizar subpartida existente
  useEffect(() => {
    if (subPartidaParaActualizar) {
      // Verificar si ya existe una subpartida con el mismo ID (actualización)
      const subpartidaExistente = recursosEditables.find(
        r => r.esSubpartida && r.id_partida_subpartida === subPartidaParaActualizar.id_partida
      );

      if (subpartidaExistente) {
        // Actualizar la subpartida existente con TODOS los datos
        setRecursosEditables(prev => {
          const nuevosRecursos = prev.map(r => {
            if (r.esSubpartida && r.id_partida_subpartida === subPartidaParaActualizar.id_partida) {
              // Recalcular parciales de los recursos dentro de la subpartida
              // Usar un Map para preservar id_recurso_apu existentes de manera más eficiente
              const recursosExistentesMap = new Map<string, RecursoAPUEditable>();
              (r.recursosSubpartida || []).forEach(re => {
                // Usar una clave única basada en recurso_id y codigo_recurso, o id_recurso_apu si existe
                const clave = re.id_recurso_apu ||
                  (re.recurso_id && re.codigo_recurso
                    ? `${re.recurso_id}-${re.codigo_recurso}`
                    : `temp-${re.orden || Date.now()}`);
                recursosExistentesMap.set(clave, re);
              });

              const recursosSubpartidaActualizados = (subPartidaParaActualizar.recursos || []).map((sr: RecursoAPUEditable, index: number) => {
                // Intentar encontrar el recurso existente por id_recurso_apu primero
                let recursoExistente: RecursoAPUEditable | undefined = undefined;
                let idRecursoApuPreservado: string | undefined = undefined;

                if (sr.id_recurso_apu) {
                  // Si tiene id_recurso_apu, buscar por ese
                  recursoExistente = Array.from(recursosExistentesMap.values()).find(
                    re => re.id_recurso_apu === sr.id_recurso_apu
                  );
                  if (recursoExistente) {
                    idRecursoApuPreservado = recursoExistente.id_recurso_apu;
                  }
                }

                // Si no se encontró por id_recurso_apu, buscar por recurso_id y codigo_recurso
                if (!recursoExistente && sr.recurso_id && sr.codigo_recurso) {
                  recursoExistente = Array.from(recursosExistentesMap.values()).find(
                    re => re.recurso_id === sr.recurso_id && re.codigo_recurso === sr.codigo_recurso
                  );
                  if (recursoExistente) {
                    idRecursoApuPreservado = recursoExistente.id_recurso_apu;
                  }
                }

                // Si es un recurso nuevo (sin id_recurso_apu), generar uno estable
                const idRecursoApuFinal = idRecursoApuPreservado || sr.id_recurso_apu ||
                  (sr.recurso_id && sr.codigo_recurso
                    ? `temp-${sr.recurso_id}-${sr.codigo_recurso}`
                    : `temp-${subPartidaParaActualizar.id_partida}-${index}-${sr.orden || index}`);

                // Calcular parcial usando el rendimiento y jornada de la subpartida
                const rendimientoSubpartida = subPartidaParaActualizar.rendimiento || 1.0;
                const jornadaSubpartida = subPartidaParaActualizar.jornada || 8;

                let parcialCalculado = 0;
                const { tipo_recurso, cantidad, precio, cuadrilla, desperdicio_porcentaje, unidad_medida } = sr;

                switch (tipo_recurso) {
                  case 'MATERIAL':
                    const cantidadConDesperdicio = cantidad * (1 + (desperdicio_porcentaje || 0) / 100);
                    parcialCalculado = roundToTwo(cantidadConDesperdicio * precio);
                    break;

                  case 'MANO_OBRA': {
                    if (rendimientoSubpartida > 0 && jornadaSubpartida > 0) {
                      const cuadrillaValue = cuadrilla || 1;
                      parcialCalculado = roundToTwo((1 / rendimientoSubpartida) * jornadaSubpartida * cuadrillaValue * precio);
                    }
                    break;
                  }

                  case 'EQUIPO': {
                    if (unidad_medida === '%mo' || unidad_medida?.toLowerCase() === '%mo') {
                      // Para %mo, necesitamos calcular la suma de parciales de MO de la subpartida
                      const sumaHHManoObra = (subPartidaParaActualizar.recursos || [])
                        .filter(r => r.tipo_recurso === 'MANO_OBRA')
                        .reduce((suma, r) => {
                          if (rendimientoSubpartida > 0 && jornadaSubpartida > 0) {
                            const cuadrillaValue = r.cuadrilla || 1;
                            const parcialMO = (1 / rendimientoSubpartida) * jornadaSubpartida * cuadrillaValue * (r.precio || 0);
                            return suma + parcialMO;
                          }
                          return suma;
                        }, 0);
                      parcialCalculado = roundToTwo(sumaHHManoObra * (cantidad / 100));
                    } else if (unidad_medida === 'hm' || unidad_medida?.toLowerCase() === 'hm') {
                      if (rendimientoSubpartida > 0 && jornadaSubpartida > 0) {
                        const cuadrillaValue = cuadrilla || 1;
                        parcialCalculado = roundToTwo((1 / rendimientoSubpartida) * jornadaSubpartida * cuadrillaValue * precio);
                      }
                    } else {
                      parcialCalculado = roundToTwo(cantidad * precio);
                    }
                    break;
                  }

                  case 'SUBCONTRATO':
                    parcialCalculado = roundToTwo(cantidad * precio);
                    break;

                  default:
                    parcialCalculado = roundToTwo(cantidad * precio);
                }

                return {
                  ...sr,
                  id_recurso_apu: idRecursoApuFinal,
                  parcial: parcialCalculado,
                  // Asegurar que todos los campos necesarios estén presentes
                  enEdicion: false,
                  esNuevo: !idRecursoApuPreservado, // Marcar como nuevo si no tenía id_recurso_apu
                  esSubpartida: false, // Los recursos dentro de la subpartida no son subpartidas
                };
              });

              // Recalcular precio_unitario_subpartida sumando los parciales actualizados
              const costoDirectoSubpartida = recursosSubpartidaActualizados.reduce((suma, subr) => suma + (subr.parcial || 0), 0);
              const nuevoPrecioUnitario = Math.round(costoDirectoSubpartida * 100) / 100; // roundToTwo equivalente

              return {
                ...r,
                descripcion: subPartidaParaActualizar.descripcion,
                unidad_medida: subPartidaParaActualizar.unidad_medida,
                precio_unitario_subpartida: nuevoPrecioUnitario, // Usar el recalculado, no el que viene del modal
                precio: Math.round(r.cantidad * nuevoPrecioUnitario * 100) / 100, // El precio calculado va aquí
                parcial: roundToTwo(r.cantidad * nuevoPrecioUnitario), // Parcial = cantidad × precio_unitario_subpartida
                recursosSubpartida: recursosSubpartidaActualizados,
                // Actualizar también el id_partida_original
                id_partida_original: subPartidaParaActualizar.id_partida_original ||
                  (subPartidaParaActualizar.recursos && subPartidaParaActualizar.recursos.length > 0
                    ? (subPartidaParaActualizar.recursos[0] as any).id_partida_original || r.id_partida_original
                    : r.id_partida_original),
                // Actualizar rendimiento y jornada guardados
                rendimientoSubpartida: subPartidaParaActualizar.rendimiento,
                jornadaSubpartida: subPartidaParaActualizar.jornada,
              };
            }
            return r;
          });

          return nuevosRecursos;
        });

        setHasChanges(true);

        // Limpiar el estado después de procesar
        if (onLimpiarSubPartidaParaActualizar) {
          setTimeout(() => onLimpiarSubPartidaParaActualizar(), 0);
        }
      } else {
      }
    }
  }, [subPartidaParaActualizar, recursosEditables, onLimpiarSubPartidaParaActualizar]);

  // Handler para actualizar metrado de la partida
  const handleActualizarMetrado = async (nuevoMetrado: number) => {
    if (!partida || !id_partida || esPartidaNoGuardada) return;

    try {
      await updatePartida.mutateAsync({
        id_partida: id_partida,
        metrado: nuevoMetrado,
        parcial_partida: nuevoMetrado * partida.precio_unitario,
      });
      setHasPartidaChanges(false);
      // Invalidar y refetch query de estructura para actualizar la tabla principal
      // El backend recalcula totales automáticamente
      await queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
      await queryClient.refetchQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
    } catch (error) {
      // El toast de error ya se muestra en el hook
      // Restaurar valor original en caso de error
      setMetradoInput(String(partida.metrado));
    }
  };

  // Handler para actualizar unidad de medida de la partida
  const handleActualizarUnidadMedida = async (nuevaUnidad: string) => {
    if (!partida || !id_partida || esPartidaNoGuardada) return;

    const unidadTrimmed = nuevaUnidad.trim() || 'und';

    try {
      await updatePartida.mutateAsync({
        id_partida: id_partida,
        unidad_medida: unidadTrimmed,
      });
      setHasPartidaChanges(false);
      // Invalidar y refetch query de estructura para actualizar la tabla principal
      // El backend recalcula totales automáticamente
      await queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
      await queryClient.refetchQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
    } catch (error) {
      // El toast de error ya se muestra en el hook
      // Restaurar valor original en caso de error
      setUnidadMedidaInput(partida.unidad_medida);
    }
  };

  const handleGuardarCambios = async () => {
    if (!id_partida || !id_presupuesto || !id_proyecto) {
      toast.error('Faltan datos necesarios para guardar el APU');
      return;
    }

    if (!hasChanges) {
      toast('No hay cambios para guardar', { icon: 'ℹ️' });
      return;
    }

    if (isSaving) {
      return; // Ya se está guardando, evitar múltiples llamadas
    }

    const errores: {
      sinSeleccionar: string[];
      sinCantidad: string[];
      sinPrecio: string[];
      sinCuadrilla: string[];
    } = {
      sinSeleccionar: [],
      sinCantidad: [],
      sinPrecio: [],
      sinCuadrilla: []
    };

    recursosEditables.forEach((r, index) => {
      // Si es subpartida, validar solo cantidad
      if (r.esSubpartida) {
        if (r.cantidad === undefined || r.cantidad === null || r.cantidad <= 0) {
          errores.sinCantidad.push(r.descripcion.trim());
        }
        return; // No validar precio ni cuadrilla para subpartidas
      }

      // Validaciones para recursos normales
      if (!r.recurso_id || !r.descripcion) {
        errores.sinSeleccionar.push(`Fila ${index + 1}`);
      } else {
        if (r.cantidad === undefined || r.cantidad === null || r.cantidad <= 0) {
          errores.sinCantidad.push(r.descripcion.trim());
        }
        if (!r.precio || r.precio <= 0) {
          errores.sinPrecio.push(r.descripcion.trim());
        }
        // Validar cuadrilla solo para MO con "hh" y EQUIPO con "hm"
        const unidadMedidaLower = r.unidad_medida?.toLowerCase() || '';
        const requiereCuadrilla = (r.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
          (r.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');
        if (requiereCuadrilla && (!r.cuadrilla || r.cuadrilla <= 0)) {
          errores.sinCuadrilla.push(r.descripcion.trim());
        }
      }
    });

    const totalErrores = errores.sinSeleccionar.length + errores.sinCantidad.length +
      errores.sinPrecio.length + errores.sinCuadrilla.length;

    if (totalErrores > 0) {
      const mensajes: string[] = [];

      if (errores.sinSeleccionar.length > 0) {
        mensajes.push(`Recursos sin seleccionar: ${errores.sinSeleccionar.join(', ')}`);
      }
      if (errores.sinCantidad.length > 0) {
        const recursos = errores.sinCantidad.length <= 3
          ? errores.sinCantidad.join(', ')
          : `${errores.sinCantidad.slice(0, 2).join(', ')} y ${errores.sinCantidad.length - 2} más`;
        mensajes.push(`Falta cantidad: ${recursos}`);
      }
      if (errores.sinPrecio.length > 0) {
        const recursos = errores.sinPrecio.length <= 3
          ? errores.sinPrecio.join(', ')
          : `${errores.sinPrecio.slice(0, 2).join(', ')} y ${errores.sinPrecio.length - 2} más`;
        mensajes.push(`Falta precio: ${recursos}`);
      }
      if (errores.sinCuadrilla.length > 0) {
        const recursos = errores.sinCuadrilla.length <= 3
          ? errores.sinCuadrilla.join(', ')
          : `${errores.sinCuadrilla.slice(0, 2).join(', ')} y ${errores.sinCuadrilla.length - 2} más`;
        mensajes.push(`Falta cuadrilla: ${recursos}`);
      }

      const mensajeError = mensajes.join('\n');
      toast.error(mensajeError, { duration: 6000 });
      return;
    }

    const { data: apuDataActualizado } = await refetchApu();
    const apuExiste = apuDataActualizado || apuData;

    try {
      setIsSaving(true);
      if (onGuardandoCambios) {
        onGuardandoCambios(true);
      }
      const recursosInput: RecursoApuInput[] = recursosEditables
        .filter(r => (r.recurso_id && r.descripcion) || r.esSubpartida)
        .map((r, index) => {
          const baseInput = {
            codigo_recurso: r.esSubpartida ? (r.codigo_recurso || '') : r.codigo_recurso,
            descripcion: r.descripcion,
            unidad_medida: r.unidad_medida,
            tipo_recurso: r.tipo_recurso,
            tipo_recurso_codigo: r.tipo_recurso,
            precio_usuario: roundToTwo(r.precio), // Asegurar que se guarde con 2 decimales
            cuadrilla: r.cuadrilla ? truncateToFour(r.cuadrilla) : undefined, // Cuadrilla con 4 decimales
            cantidad: truncateToFour(r.cantidad), // Cantidad con 4 decimales
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: truncateToFour(r.cantidad * (1 + (r.desperdicio_porcentaje || 0) / 100)),
            parcial: roundToTwo(r.parcial), // Parcial con 2 decimales
            orden: index,
            tiene_precio_override: r.tiene_precio_override || false,
            precio_override: r.tiene_precio_override ? r.precio_override : undefined,
          };


          // Si es subpartida, agregar campos específicos
          if (r.esSubpartida) {
            return {
              ...baseInput,
              id_partida_subpartida: r.id_partida_subpartida,
              precio_unitario_subpartida: roundToTwo(r.precio_unitario_subpartida || 0),
              // recurso_id es opcional para subpartidas
              recurso_id: r.recurso_id || undefined,
            };
          } else {
            // Para recursos normales
            return {
              ...baseInput,
              recurso_id: r.recurso_id,
              id_precio_recurso: r.id_precio_recurso,
            };
          }
        });

      // Variables para tracking de cambios
      let recursosAEliminar: any[] = [];
      let recursosNuevos: RecursoApuInput[] = [];
      let recursosActualizados: Array<{ id_recurso_apu: string; recurso: RecursoApuInput }> = [];

      // Detectar subpartidas nuevas (con temp_id) y crearlas ANTES de guardar cambios
      const subpartidasNuevas = recursosEditables.filter(
        r => r.esSubpartida && r.id_partida_subpartida?.startsWith('temp_')
      );

      const mapeoTempIdARealId = new Map<string, string>();

      if (subpartidasNuevas.length > 0 && id_partida && id_presupuesto && id_proyecto) {
        // Obtener partida completa para obtener id_titulo y nivel_partida
        let partidaCompleta: any = null;
        try {
          const partidaResponse = await executeQuery<{ getPartida: any }>(
            GET_PARTIDA_QUERY,
            { id_partida }
          );
          partidaCompleta = partidaResponse?.getPartida;
        } catch (error) {
          console.error('Error obteniendo partida completa:', error);
        }

        // Si no se obtuvo de la query, buscar en la estructura del presupuesto
        if (!partidaCompleta?.id_titulo) {
          // Obtener estructura completa del presupuesto para buscar la partida
          try {
            const estructuraResponse = await executeQuery<{ getEstructuraPresupuesto: any }>(
              GET_ESTRUCTURA_PRESUPUESTO_QUERY,
              { id_presupuesto }
            );
            if (estructuraResponse?.getEstructuraPresupuesto?.partidas) {
              partidaCompleta = estructuraResponse.getEstructuraPresupuesto.partidas.find(
                (p: any) => p.id_partida === id_partida
              );
            }
          } catch (error) {
            console.error('Error obteniendo estructura del presupuesto:', error);
          }
        }

        // Preparar subpartidas para crear
        const subpartidasParaCrear = subpartidasNuevas.map(subpartida => ({
          temp_id: subpartida.id_partida_subpartida!,
          id_partida_padre: id_partida,
          id_presupuesto: id_presupuesto,
          id_proyecto: id_proyecto,
          id_titulo: partidaCompleta?.id_titulo || '',
          nivel_partida: partidaCompleta?.nivel_partida ? partidaCompleta.nivel_partida + 1 : 1,
          descripcion: subpartida.descripcion,
          unidad_medida: subpartida.unidad_medida,
          precio_unitario: subpartida.precio_unitario_subpartida || 0,
          metrado: subpartida.cantidad,
          rendimiento: subpartida.rendimientoSubpartida || 1.0,
          jornada: subpartida.jornadaSubpartida || 8,
          recursos: (subpartida.recursosSubpartida || []).map((r: RecursoAPUEditable) => ({
            recurso_id: r.recurso_id || undefined,
            codigo_recurso: r.codigo_recurso || '',
            descripcion: r.descripcion,
            unidad_medida: r.unidad_medida,
            tipo_recurso: r.tipo_recurso || 'MATERIAL',
            id_precio_recurso: r.id_precio_recurso || undefined,
            precio_usuario: roundToTwo(r.precio || 0),
            cuadrilla: r.cuadrilla ? truncateToFour(r.cuadrilla) : undefined,
            cantidad: truncateToFour(r.cantidad),
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: truncateToFour(r.cantidad * (1 + (r.desperdicio_porcentaje || 0) / 100)),
            parcial: roundToTwo(r.parcial || 0),
            orden: r.orden || 0,
          })),
        }));

        // Crear partidas subpartidas y sus APUs
        const resultado = await executeMutation<{ crearPartidasSubpartidasYAPUs: { mapeo: Array<{ temp_id: string; id_partida_real: string }> } }>(
          CREAR_PARTIDAS_SUBPARTIDAS_Y_APUS_MUTATION,
          { subpartidas: subpartidasParaCrear }
        );

        // Crear mapeo de temp_id -> id_partida_real
        resultado.crearPartidasSubpartidasYAPUs.mapeo.forEach(m => {
          mapeoTempIdARealId.set(m.temp_id, m.id_partida_real);
        });

        // Actualizar recursos editables con IDs reales
        recursosEditables.forEach(recurso => {
          if (recurso.esSubpartida && recurso.id_partida_subpartida && mapeoTempIdARealId.has(recurso.id_partida_subpartida)) {
            recurso.id_partida_subpartida = mapeoTempIdARealId.get(recurso.id_partida_subpartida)!;
          }
        });

        // Invalidar queries para refrescar datos
        queryClient.invalidateQueries({ queryKey: ['apu'] });
        queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto'] });
      }

      // Detectar y actualizar subpartidas existentes que fueron modificadas
      const subpartidasExistentes = recursosEditables.filter(
        r => r.esSubpartida && r.id_partida_subpartida && !r.id_partida_subpartida.startsWith('temp_')
      );

      if (subpartidasExistentes.length > 0 && valoresOriginales) {
        const tolerancia = 0.0001;

        for (const subpartida of subpartidasExistentes) {
          const subpartidaOriginal = valoresOriginales.recursos.find(
            orig => orig.id_partida_subpartida === subpartida.id_partida_subpartida
          );

          if (!subpartidaOriginal) continue;

          // Verificar si hay cambios en la subpartida
          const hayCambiosCantidad = Math.abs((subpartida.cantidad || 0) - (subpartidaOriginal.cantidad || 0)) > tolerancia;
          const hayCambiosRendimiento = subpartida.rendimientoSubpartida !== undefined &&
            subpartidaOriginal.rendimientoSubpartida !== undefined &&
            Math.abs((subpartida.rendimientoSubpartida || 1.0) - (subpartidaOriginal.rendimientoSubpartida || 1.0)) > tolerancia;
          const hayCambiosJornada = subpartida.jornadaSubpartida !== undefined &&
            subpartidaOriginal.jornadaSubpartida !== undefined &&
            Math.abs((subpartida.jornadaSubpartida || 8) - (subpartidaOriginal.jornadaSubpartida || 8)) > tolerancia;

          // Comparar recursos de la subpartida
          const recursosActuales = subpartida.recursosSubpartida || [];
          const recursosOriginales = subpartidaOriginal.recursosSubpartida || [];

          // Función para comparar recursos
          const recursoCambio = (actual: RecursoAPUEditable, original: RecursoAPUEditable | undefined): boolean => {
            if (!original) return true;
            return (
              Math.abs((actual.cantidad || 0) - (original.cantidad || 0)) > tolerancia ||
              Math.abs((actual.precio || 0) - (original.precio || 0)) > tolerancia ||
              Math.abs((actual.parcial || 0) - (original.parcial || 0)) > tolerancia ||
              Math.abs((actual.cuadrilla || 0) - (original.cuadrilla || 0)) > tolerancia ||
              Math.abs((actual.desperdicio_porcentaje || 0) - (original.desperdicio_porcentaje || 0)) > tolerancia ||
              actual.id_precio_recurso !== original.id_precio_recurso ||
              actual.orden !== original.orden ||
              actual.tiene_precio_override !== original.tiene_precio_override ||
              Math.abs((actual.precio_override || 0) - (original.precio_override || 0)) > tolerancia
            );
          };

          // Crear Maps para comparación
          const recursosActualesMap = new Map<string, RecursoAPUEditable>();
          recursosActuales.forEach((r, index) => {
            const clave = r.id_recurso_apu || `${r.recurso_id || ''}-${r.codigo_recurso || ''}-${r.orden !== undefined ? r.orden : index}`;
            recursosActualesMap.set(clave, r);
          });

          const recursosOriginalesMap = new Map<string, RecursoAPUEditable>();
          recursosOriginales.forEach((r, index) => {
            const clave = r.id_recurso_apu || `${r.recurso_id || ''}-${r.codigo_recurso || ''}-${r.orden !== undefined ? r.orden : index}`;
            recursosOriginalesMap.set(clave, r);
          });

          // Identificar cambios en recursos
          const recursosAgregarSubpartida: RecursoAPUEditable[] = [];
          const recursosActualizarSubpartida: RecursoAPUEditable[] = [];
          const recursosEliminarSubpartida: string[] = [];

          for (const [clave, actual] of recursosActualesMap) {
            const original = recursosOriginalesMap.get(clave);
            if (!original) {
              recursosAgregarSubpartida.push(actual);
            } else if (recursoCambio(actual, original)) {
              recursosActualizarSubpartida.push(actual);
            }
          }

          for (const [clave, original] of recursosOriginalesMap) {
            if (!recursosActualesMap.has(clave) && original.id_recurso_apu) {
              recursosEliminarSubpartida.push(original.id_recurso_apu);
            }
          }

          const hayCambiosRecursos = recursosAgregarSubpartida.length > 0 ||
            recursosActualizarSubpartida.length > 0 ||
            recursosEliminarSubpartida.length > 0;

          // Si hay cambios, actualizar el APU de la subpartida
          if (hayCambiosCantidad || hayCambiosRendimiento || hayCambiosJornada || hayCambiosRecursos) {
            try {
              // Obtener el APU de la subpartida
              const subpartidaApuResponse = await executeQuery<{ getApuByPartida: any }>(
                GET_APU_BY_PARTIDA_QUERY,
                { id_partida: subpartida.id_partida_subpartida! }
              );

              if (!subpartidaApuResponse?.getApuByPartida) {
                continue;
              }

              const subpartidaApu = subpartidaApuResponse.getApuByPartida;

              // Actualizar rendimiento/jornada si cambió
              if (hayCambiosRendimiento || hayCambiosJornada) {
                await executeMutation<{ updateApu: any }>(
                  UPDATE_APU_MUTATION,
                  {
                    id_apu: subpartidaApu.id_apu,
                    rendimiento: subpartida.rendimientoSubpartida,
                    jornada: subpartida.jornadaSubpartida,
                  }
                );
              }

              // Eliminar recursos
              for (const idRecursoApu of recursosEliminarSubpartida) {
                await executeMutation<{ removeRecursoFromApu: any }>(
                  REMOVE_RECURSO_FROM_APU_MUTATION,
                  {
                    id_apu: subpartidaApu.id_apu,
                    id_recurso_apu: idRecursoApu,
                  }
                );
              }

              // Agregar recursos nuevos
              for (const recurso of recursosAgregarSubpartida) {
                const recursoInput: RecursoApuInput = {
                  recurso_id: recurso.recurso_id || undefined,
                  codigo_recurso: recurso.codigo_recurso || '',
                  descripcion: recurso.descripcion,
                  unidad_medida: recurso.unidad_medida,
                  tipo_recurso: recurso.tipo_recurso,
                  tipo_recurso_codigo: recurso.tipo_recurso,
                  id_precio_recurso: recurso.id_precio_recurso || undefined,
                  precio_usuario: roundToTwo(recurso.precio || 0),
                  tiene_precio_override: recurso.tiene_precio_override || false,
                  precio_override: recurso.tiene_precio_override ? recurso.precio_override : undefined,
                  cuadrilla: recurso.cuadrilla ? truncateToFour(recurso.cuadrilla) : undefined,
                  cantidad: truncateToFour(recurso.cantidad),
                  desperdicio_porcentaje: recurso.desperdicio_porcentaje || 0,
                  cantidad_con_desperdicio: truncateToFour(recurso.cantidad * (1 + (recurso.desperdicio_porcentaje || 0) / 100)),
                  parcial: roundToTwo(recurso.parcial || 0),
                  orden: recurso.orden || 0,
                };

                await executeMutation<{ addRecursoToApu: any }>(
                  ADD_RECURSO_TO_APU_MUTATION,
                  {
                    id_apu: subpartidaApu.id_apu,
                    recurso: recursoInput,
                  }
                );
              }

              // Actualizar recursos modificados
              for (const recurso of recursosActualizarSubpartida) {
                if (!recurso.id_recurso_apu) continue;

                const recursoInput: RecursoApuInput = {
                  recurso_id: recurso.recurso_id || undefined,
                  codigo_recurso: recurso.codigo_recurso || '',
                  descripcion: recurso.descripcion,
                  unidad_medida: recurso.unidad_medida,
                  tipo_recurso: recurso.tipo_recurso,
                  tipo_recurso_codigo: recurso.tipo_recurso,
                  id_precio_recurso: recurso.id_precio_recurso || undefined,
                  precio_usuario: roundToTwo(recurso.precio || 0),
                  tiene_precio_override: recurso.tiene_precio_override || false,
                  precio_override: recurso.tiene_precio_override ? recurso.precio_override : undefined,
                  cuadrilla: recurso.cuadrilla ? truncateToFour(recurso.cuadrilla) : undefined,
                  cantidad: truncateToFour(recurso.cantidad),
                  desperdicio_porcentaje: recurso.desperdicio_porcentaje || 0,
                  cantidad_con_desperdicio: truncateToFour(recurso.cantidad * (1 + (recurso.desperdicio_porcentaje || 0) / 100)),
                  parcial: roundToTwo(recurso.parcial || 0),
                  orden: recurso.orden || 0,
                };

                await executeMutation<{ updateRecursoInApu: any }>(
                  UPDATE_RECURSO_IN_APU_MUTATION,
                  {
                    id_apu: subpartidaApu.id_apu,
                    id_recurso_apu: recurso.id_recurso_apu,
                    recurso: recursoInput,
                  }
                );
              }

              // Calcular el nuevo costo_directo localmente sumando los parciales de los recursos actualizados
              const nuevoCostoDirecto = recursosActuales.reduce((suma, r) => suma + (r.parcial || 0), 0);

              // Actualizar el precio_unitario_subpartida en el recurso del APU padre
              // Nota: Esto se hará después cuando se actualicen los recursos del APU padre
              // El precio_unitario_subpartida se actualizará automáticamente cuando se recargue el APU

              // Invalidar queries para refrescar datos
              queryClient.invalidateQueries({ queryKey: ['apu'] });
            } catch (error: any) {
              // Continuar con las demás subpartidas aunque una falle
            }
          }
        }

      }

      if (apuExiste) {
        const apuParaActualizar = apuDataActualizado || apuData;
        if (!apuParaActualizar) {
          toast.error('Error: No se pudo obtener el APU para actualizar');
          return;
        }

        // Actualizar APU (rendimiento/jornada) usando mutación directa para evitar toast automático
        await executeMutation<{ updateApu: any }>(
          UPDATE_APU_MUTATION,
          {
            id_apu: apuParaActualizar.id_apu,
            rendimiento: rendimiento,
            jornada: jornada,
          }
        );
        // Invalidar queries sin mostrar toast
        queryClient.invalidateQueries({ queryKey: ['apu'] });

        const recursosExistentes = apuParaActualizar.recursos;
        const recursosNuevosIds = new Set(recursosEditables.map(r => r.id_recurso_apu));

        // Función helper para comparar si un recurso cambió
        const recursoCambio = (editable: RecursoAPUEditable, existente: any): boolean => {
          if (!existente) return true;
          const tolerancia = 0.0001;
          return (
            Math.abs((editable.cantidad || 0) - (existente.cantidad || 0)) > tolerancia ||
            Math.abs((editable.precio || 0) - (existente.precio || 0)) > tolerancia ||
            Math.abs((editable.parcial || 0) - (existente.parcial || 0)) > tolerancia ||
            Math.abs((editable.cuadrilla || 0) - (existente.cuadrilla || 0)) > tolerancia ||
            Math.abs((editable.desperdicio_porcentaje || 0) - (existente.desperdicio_porcentaje || 0)) > tolerancia ||
            editable.id_precio_recurso !== existente.id_precio_recurso ||
            editable.orden !== existente.orden ||
            editable.tiene_precio_override !== existente.tiene_precio_override ||
            Math.abs((editable.precio_override || 0) - (existente.precio_override || 0)) > tolerancia
          );
        };

        // Identificar recursos a eliminar
        recursosAEliminar = recursosExistentes.filter(
          r => !recursosNuevosIds.has(r.id_recurso_apu)
        );

        // Identificar recursos nuevos y actualizados
        recursosNuevos = [];
        recursosActualizados = [];

        for (const recursoEditable of recursosEditables.filter(r => (r.recurso_id && r.descripcion) || r.esSubpartida)) {
          const recursoExistente = recursosExistentes.find(
            r => r.id_recurso_apu === recursoEditable.id_recurso_apu
          );

          const baseInput = {
            codigo_recurso: recursoEditable.esSubpartida ? (recursoEditable.codigo_recurso || '') : recursoEditable.codigo_recurso,
            descripcion: recursoEditable.descripcion,
            unidad_medida: recursoEditable.unidad_medida,
            tipo_recurso: recursoEditable.tipo_recurso,
            tipo_recurso_codigo: recursoEditable.tipo_recurso,
            precio_usuario: recursoEditable.esSubpartida ? roundToTwo(recursoEditable.precio || 0) : roundToTwo(recursoEditable.precio), // Para subpartidas, precio_usuario tiene el valor calculado
            cuadrilla: recursoEditable.cuadrilla ? truncateToFour(recursoEditable.cuadrilla) : undefined, // Cuadrilla con 4 decimales
            cantidad: truncateToFour(recursoEditable.cantidad), // Cantidad con 4 decimales
            desperdicio_porcentaje: recursoEditable.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: truncateToFour(recursoEditable.cantidad * (1 + (recursoEditable.desperdicio_porcentaje || 0) / 100)),
            parcial: roundToTwo(recursoEditable.parcial), // Parcial calculado (cantidad × precio_unitario_subpartida para subpartidas)
            orden: recursoEditable.orden,
            tiene_precio_override: recursoEditable.tiene_precio_override || false,
            precio_override: recursoEditable.tiene_precio_override ? recursoEditable.precio_override : undefined,
          };

          const recursoInput: RecursoApuInput = recursoEditable.esSubpartida ? {
            ...baseInput,
            id_partida_subpartida: recursoEditable.id_partida_subpartida,
            precio_unitario_subpartida: roundToTwo(recursoEditable.precio_unitario_subpartida || 0),
            recurso_id: recursoEditable.recurso_id || undefined,
          } : {
            ...baseInput,
            recurso_id: recursoEditable.recurso_id,
            id_precio_recurso: recursoEditable.id_precio_recurso,
          };


          if (recursoEditable.esNuevo || !recursoExistente) {
            recursosNuevos.push(recursoInput);
          } else if (recursoCambio(recursoEditable, recursoExistente)) {
            // Solo actualizar si realmente cambió
            recursosActualizados.push({
              id_recurso_apu: recursoEditable.id_recurso_apu,
              recurso: recursoInput
            });
          }
        }

        // Ejecutar todas las operaciones en paralelo usando mutaciones directas (sin toasts automáticos)
        const operaciones: Promise<any>[] = [];

        // Separar subpartidas existentes de recursos normales
        const subpartidasAEliminar = recursosAEliminar.filter(
          r => r.id_partida_subpartida && !r.id_partida_subpartida.startsWith('temp_')
        );
        const recursosNormalesAEliminar = recursosAEliminar.filter(
          r => !r.id_partida_subpartida || r.id_partida_subpartida.startsWith('temp_')
        );

        // Primero obtener los APUs de las subpartidas en paralelo
        const subpartidasConApu = await Promise.all(
          subpartidasAEliminar.map(async (recurso) => {
            try {
              const subpartidaApuResponse = await executeQuery<{ getApuByPartida: any }>(
                GET_APU_BY_PARTIDA_QUERY,
                { id_partida: recurso.id_partida_subpartida! }
              );

              return {
                recurso,
                apu: subpartidaApuResponse?.getApuByPartida || null,
              };
            } catch (error) {
              return {
                recurso,
                apu: null,
              };
            }
          })
        );

        // Eliminar recursos normales y subpartidas nuevas (temp_)
        for (const recurso of recursosNormalesAEliminar) {
          operaciones.push(
            executeMutation<{ removeRecursoFromApu: any }>(
              REMOVE_RECURSO_FROM_APU_MUTATION,
              {
                id_apu: apuParaActualizar.id_apu,
                id_recurso_apu: recurso.id_recurso_apu,
              }
            ).then(() => {
              // Invalidar queries sin mostrar toast
              queryClient.invalidateQueries({ queryKey: ['apu'] });
            })
          );
        }

        // Eliminar subpartidas existentes: recurso del APU padre + partida de la subpartida
        // Nota: No es necesario eliminar el APU manualmente porque PartidaService.eliminar 
        // automáticamente elimina el APU asociado cuando se elimina la partida
        for (const { recurso, apu } of subpartidasConApu) {
          // 1. Eliminar el recurso del APU padre
          operaciones.push(
            executeMutation<{ removeRecursoFromApu: any }>(
              REMOVE_RECURSO_FROM_APU_MUTATION,
              {
                id_apu: apuParaActualizar.id_apu,
                id_recurso_apu: recurso.id_recurso_apu,
              }
            )
          );

          // 2. Eliminar la partida de la subpartida
          // PartidaService.eliminar automáticamente eliminará el APU asociado
          if (recurso.id_partida_subpartida) {
            operaciones.push(
              executeMutation<{ deletePartida: any }>(
                DELETE_PARTIDA_MUTATION,
                {
                  id_partida: recurso.id_partida_subpartida,
                }
              ).catch((error) => {
                // Si falla eliminar la partida, continuar
              })
            );
          }
        }

        // Agregar recursos nuevos
        for (const recurso of recursosNuevos) {
          operaciones.push(
            executeMutation<{ addRecursoToApu: any }>(
              ADD_RECURSO_TO_APU_MUTATION,
              {
                id_apu: apuParaActualizar.id_apu,
                recurso: recurso,
              }
            ).then(() => {
              // Invalidar queries sin mostrar toast
              queryClient.invalidateQueries({ queryKey: ['apu'] });
            })
          );
        }

        // Actualizar recursos modificados
        for (const { id_recurso_apu, recurso } of recursosActualizados) {
          operaciones.push(
            executeMutation<{ updateRecursoInApu: any }>(
              UPDATE_RECURSO_IN_APU_MUTATION,
              {
                id_apu: apuParaActualizar.id_apu,
                id_recurso_apu: id_recurso_apu,
                recurso: recurso,
              }
            ).then(() => {
              // Invalidar queries sin mostrar toast
              queryClient.invalidateQueries({ queryKey: ['apu'] });
            })
          );
        }

        // Ejecutar todas las operaciones y esperar que terminen
        await Promise.all(operaciones);
      } else {
        await createApu.mutateAsync({
          id_partida,
          id_presupuesto,
          id_proyecto,
          rendimiento: rendimiento,
          jornada: jornada,
          recursos: recursosInput,
        });
      }

      // Refetch del APU para obtener los datos actualizados
      const { data: apuDataRefetch } = await refetchApu();

      // Si hay datos refetchados, recargar el estado local
      if (apuDataRefetch) {
        const nuevoRendimiento = apuDataRefetch.rendimiento || 1.0;
        const nuevaJornada = apuDataRefetch.jornada || 8;
        setRendimiento(nuevoRendimiento);
        setJornada(nuevaJornada);
        setRendimientoInput(String(nuevoRendimiento));
        setJornadaInput(String(nuevaJornada));

        // Recargar recursos con subpartidas
        const recursosEditablePromises = apuDataRefetch.recursos.map(async (r: any, index: number) => {
          const tieneIdSubpartida = !!(r.id_partida_subpartida && typeof r.id_partida_subpartida === 'string' && r.id_partida_subpartida.trim() !== '');
          const noTieneRecursoId = !r.recurso_id || r.recurso_id.trim() === '';
          const tienePrecioUnitarioSubpartida = r.precio_unitario_subpartida !== undefined && r.precio_unitario_subpartida !== null;
          const esSubpartida = tieneIdSubpartida || (noTieneRecursoId && tienePrecioUnitarioSubpartida);

          const precioFinal = esSubpartida && r.precio_unitario_subpartida !== undefined
            ? r.precio_unitario_subpartida
            : (r.precio || 0);

          const recursoBase: RecursoAPUEditable = {
            id_recurso_apu: r.id_recurso_apu,
            recurso_id: r.recurso_id || '',
            codigo_recurso: r.codigo_recurso || '',
            descripcion: r.descripcion,
            tipo_recurso: r.tipo_recurso,
            unidad_medida: r.unidad_medida,
            id_precio_recurso: r.id_precio_recurso,
            precio: precioFinal,
            cuadrilla: r.cuadrilla,
            cantidad: r.cantidad,
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            parcial: 0,
            orden: r.orden,
            enEdicion: false,
            esNuevo: false,
            esSubpartida: esSubpartida,
            id_partida_subpartida: r.id_partida_subpartida || undefined,
            precio_unitario_subpartida: r.precio_unitario_subpartida,
            recursosSubpartida: [],
            rendimientoSubpartida: undefined,
            jornadaSubpartida: undefined,
          };

          recursoBase.parcial = calcularParcial(recursoBase);

          // Si es subpartida, cargar su APU para obtener recursos, rendimiento y jornada
          if (esSubpartida && r.id_partida_subpartida) {
            try {
              const subpartidaApuResponse = await executeQuery<{ getApuByPartida: any }>(
                GET_APU_BY_PARTIDA_QUERY,
                { id_partida: r.id_partida_subpartida }
              );

              if (subpartidaApuResponse?.getApuByPartida) {
                const subpartidaApu = subpartidaApuResponse.getApuByPartida;

                const recursosSubpartida: RecursoAPUEditable[] = (subpartidaApu.recursos || []).map((sr: any) => {
                  const recursoSub: RecursoAPUEditable = {
                    id_recurso_apu: sr.id_recurso_apu,
                    recurso_id: sr.recurso_id || '',
                    codigo_recurso: sr.codigo_recurso || '',
                    descripcion: sr.descripcion,
                    tipo_recurso: sr.tipo_recurso,
                    unidad_medida: sr.unidad_medida,
                    id_precio_recurso: sr.id_precio_recurso,
                    precio: sr.precio || 0,
                    cuadrilla: sr.cuadrilla,
                    cantidad: sr.cantidad,
                    desperdicio_porcentaje: sr.desperdicio_porcentaje || 0,
                    parcial: 0,
                    orden: sr.orden,
                    enEdicion: false,
                    esNuevo: false,
                    esSubpartida: false,
                  };

                  recursoSub.parcial = calcularParcial(recursoSub);
                  return recursoSub;
                });

                recursoBase.recursosSubpartida = recursosSubpartida;
                recursoBase.rendimientoSubpartida = subpartidaApu.rendimiento || 1.0;
                recursoBase.jornadaSubpartida = subpartidaApu.jornada || 8;

                try {
                  const partidaSubpartidaResponse = await executeQuery<{ getPartida: any }>(
                    GET_PARTIDA_QUERY,
                    { id_partida: r.id_partida_subpartida }
                  );

                  if (partidaSubpartidaResponse?.getPartida) {
                    const partidaSubpartida = partidaSubpartidaResponse.getPartida;
                    recursoBase.id_partida_original = partidaSubpartida.id_partida_padre || id_partida || undefined;
                    if (partidaSubpartida.descripcion) {
                      recursoBase.descripcion = partidaSubpartida.descripcion;
                    }
                  } else {
                    recursoBase.id_partida_original = id_partida || undefined;
                  }
                } catch (error) {
                  recursoBase.id_partida_original = id_partida || undefined;
                }
              }
            } catch (error) {
              // Error silencioso al cargar APU de subpartida
            }
          }

          return recursoBase;
        });

        const recursosEditable = await Promise.all(recursosEditablePromises);
        setRecursosEditables(recursosEditable);

        // Actualizar valores originales con los datos recargados
        setValoresOriginales({
          rendimiento: nuevoRendimiento,
          jornada: nuevaJornada,
          recursos: JSON.parse(JSON.stringify(recursosEditable))
        });
      }

      setHasChanges(false);

      // Invalidar y refetch query de estructura del presupuesto para actualizar totales
      // El backend recalcula totales de títulos y presupuesto automáticamente
      if (id_presupuesto) {
        // Pequeño delay para dar tiempo al backend de recalcular totales
        await new Promise(resolve => setTimeout(resolve, 100));

        // Invalidar y refetch explícito para asegurar que se muestren los totales actualizados
        await queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
        await queryClient.refetchQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });
      }

      // Mostrar un solo toast de éxito
      const totalCambios = recursosAEliminar.length + recursosNuevos.length + recursosActualizados.length;
      if (totalCambios > 0) {
        toast.success(`APU actualizado correctamente (${totalCambios} cambio${totalCambios > 1 ? 's' : ''})`);
      }

      if (onGuardarCambios) {
        onGuardarCambios();
      }
    } catch (error: any) {
      console.error('Error al guardar APU:', error);
      toast.error(error?.message || 'Error al guardar el APU');
    } finally {
      setIsSaving(false);
      if (onGuardandoCambios) {
        onGuardandoCambios(false);
      }
    }
  };

  const totales = useMemo(() => {
    return recursosEditables.reduce((acc, r) => ({
      costo_materiales: acc.costo_materiales + (r.tipo_recurso === 'MATERIAL' && !r.esSubpartida ? r.parcial : 0),
      costo_mano_obra: acc.costo_mano_obra + (r.tipo_recurso === 'MANO_OBRA' ? r.parcial : 0),
      costo_equipos: acc.costo_equipos + (r.tipo_recurso === 'EQUIPO' ? r.parcial : 0),
      costo_subcontratos: acc.costo_subcontratos + (r.tipo_recurso === 'SUBCONTRATO' ? r.parcial : 0),
      costo_subpartidas: acc.costo_subpartidas + (r.esSubpartida ? (r.precio || 0) : 0),
      costo_directo: acc.costo_directo + r.parcial,
    }), {
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_equipos: 0,
      costo_subcontratos: 0,
      costo_subpartidas: 0,
      costo_directo: 0,
    });
  }, [recursosEditables]);

  const getTipoRecursoColor = (tipo: string, esSubpartida?: boolean) => {
    if (esSubpartida) {
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    }
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

  const getTipoRecursoAbrev = (tipo: string, esSubpartida?: boolean) => {
    if (esSubpartida) {
      return 'SP';
    }
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

  const isLoading = isLoadingApu || createApu.isPending || updateApu.isPending ||
    addRecursoToApu.isPending || updateRecursoInApu.isPending ||
    removeRecursoFromApu.isPending || isSaving;

  return (
    <div className="h-full flex flex-col bg-[var(--background)] border-t border-[var(--border-color)]">
      {/* HEADER FIJO - Datos de Partida y APU */}
      <div className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)] relative z-0 table-header-shadow">
        {/* Datos de Partida */}
        <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-[var(--text-secondary)] flex-shrink-0">Partida:</span>
              {hasPartida ? (
                <span 
                  className="text-xs text-[var(--text-primary)] px-1 ml-1 flex-1 min-w-0 truncate"
                  title={partida!.descripcion}
                >
                  {partida!.descripcion}
                </span>
              ) : (
                <span className="text-xs text-[var(--text-secondary)] px-1 ml-1 flex-1 min-w-0">
                  Sin seleccionar
                </span>
              )}
            </div>
            <div className="flex items-center">
              <span className="text-[var(--text-secondary)]">Item:</span>
              <Input
                type="text"
                value={hasPartida ? partida!.numero_item : ''}
                disabled
                placeholder="---"
                className="text-xs h-6 w-20 text-center px-1 ml-1 font-mono"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Unidad:</span>
              {hasPartida && !esPartidaNoGuardada && modoReal === 'edicion' ? (
                <Input
                  type="text"
                  value={unidadMedidaInput}
                  onChange={(e) => {
                    setUnidadMedidaInput(e.target.value);
                    setHasPartidaChanges(true);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== partida!.unidad_medida) {
                      handleActualizarUnidadMedida(value);
                    } else if (!value) {
                      setUnidadMedidaInput(partida!.unidad_medida);
                      setHasPartidaChanges(false);
                    }
                  }}
                  className="text-xs h-6 w-16 text-center px-1"
                />
              ) : (
                <Input
                  type="text"
                  value={hasPartida ? partida!.unidad_medida : ''}
                  disabled
                  placeholder="---"
                  className="text-xs h-6 w-16 text-center px-1"
                />
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Metrado:</span>
              {hasPartida && !esPartidaNoGuardada && modoReal === 'edicion' ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={metradoInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMetradoInput(value);
                    if (value === '' || value === '-') {
                      return;
                    }
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      setHasPartidaChanges(true);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '-') {
                      setMetradoInput(String(partida!.metrado));
                      setHasPartidaChanges(false);
                      return;
                    }
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < 0) {
                      setMetradoInput(String(partida!.metrado));
                      setHasPartidaChanges(false);
                    } else if (numValue !== partida!.metrado) {
                      handleActualizarMetrado(numValue);
                    } else {
                      setHasPartidaChanges(false);
                    }
                  }}
                  className="text-xs h-6 w-16 text-center px-1"
                />
              ) : (
                <Input
                  type="text"
                  value={hasPartida ? partida!.metrado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  disabled
                  placeholder="0.00"
                  className="text-xs h-6 w-16 text-center px-1"
                />
              )}
            </div>
            <div className="flex items-center">
              <span className="text-[var(--text-secondary)]">Estado:</span>
              <Input
                type="text"
                value={hasPartida ? partida!.estado : ''}
                disabled
                placeholder="---"
                className="text-xs h-6 w-20 px-1 ml-1"
              />
            </div>
          </div>
        </div>

        {/* Datos de APU - Rendimiento y Jornada */}
        <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Rendimiento:</span>
              {hasPartida && !esPartidaNoGuardada && modoReal === 'edicion' ? (
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
                  className="text-xs h-6 w-16 text-center px-1"
                />
              ) : (
                <Input
                  type="text"
                  value={hasPartida ? rendimiento.toFixed(4) : ''}
                  disabled
                  placeholder="1.0000"
                  className="text-xs h-6 w-16 text-center px-1"
                />
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-secondary)]">Jornada:</span>
              {hasPartida && !esPartidaNoGuardada && modoReal === 'edicion' ? (
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
                  className="text-xs h-6 w-16 text-center px-1"
                />
              ) : (
                <Input
                  type="text"
                  value={hasPartida ? jornada.toFixed(4) : ''}
                  disabled
                  placeholder="8.0000"
                  className="text-xs h-6 w-16 text-center px-1"
                />
              )}
              <span className="text-xs text-[var(--text-secondary)]">h</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Precio Unit.:</span>
              <Input
                type="text"
                value={hasPartida ? `S/ ${partida!.precio_unitario.toFixed(2)}` : ''}
                disabled
                placeholder="S/ 0.00"
                className="text-xs h-6 w-24 px-1 ml-1"
              />
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Costo Directo:</span>
              <Input
                type="text"
                value={hasPartida ? `S/ ${totales.costo_directo.toFixed(2)}` : ''}
                disabled
                placeholder="S/ 0.00"
                className="text-xs h-6 w-24 px-1 ml-1"
              />
            </div>
          </div>
        </div>

        {/* Resumen de Costos */}
        <div className="px-2 py-1.5 table-header-shadow">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Resumen:</span>
            {hasPartida ? (
              <div className="flex gap-1.5">
                <div className={`px-1.5 py-0.5 rounded text-xs ${getTipoRecursoColor('MANO_OBRA')}`}>
                  MO: S/ {totales.costo_mano_obra.toFixed(2)}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-xs ${getTipoRecursoColor('MATERIAL')}`}>
                  MT: S/ {totales.costo_materiales.toFixed(2)}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-xs ${getTipoRecursoColor('EQUIPO')}`}>
                  EQ: S/ {totales.costo_equipos.toFixed(2)}
                </div>
                {totales.costo_subcontratos > 0 && (
                  <div className={`px-1.5 py-0.5 rounded text-xs ${getTipoRecursoColor('SUBCONTRATO')}`}>
                    SC: S/ {totales.costo_subcontratos.toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-1.5">
                <div className="px-1.5 py-0.5 rounded text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 opacity-50">
                  MO: S/ 0.00
                </div>
                <div className="px-1.5 py-0.5 rounded text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 opacity-50">
                  MT: S/ 0.00
                </div>
                <div className="px-1.5 py-0.5 rounded text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 opacity-50">
                  EQ: S/ 0.00
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO CON SCROLL - Tabla de Recursos APU */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {esPartidaNoGuardada ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 max-w-sm">
              <div className="mb-2">
                <svg className="w-8 h-8 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Está modificando la estructura del presupuesto.
              </p>
              <p className="text-xs text-[var(--text-secondary)] bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                Para añadir recursos a esta partida, primero presione <span className="font-semibold">"Guardar cambios"</span> arriba.
              </p>
            </div>
          </div>
        ) : isLoadingApu ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : (
          <div className="py-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--background)] z-10 table-header-shadow">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="pl-3 pr-1 py-1 text-left font-medium text-[var(--text-secondary)] uppercase w-[35%] bg-[var(--background)] relative z-20">
                    Insumo
                  </th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">Und.</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">Cuad.</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[12%]">Cantidad</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[12%]">P.U.</th>
                  <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[15%]">Parcial</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {hasPartida && recursosEditables.map((recurso) => {
                  return (
                    <tr
                      key={recurso.id_recurso_apu}
                      className="hover:bg-[var(--card-bg)]/50 transition-colors"
                    >
                      <td className="pl-3 pr-1 py-1 text-left align-top">
                        {modoReal === 'edicion' && recurso.enEdicion && !recurso.recurso_id ? (
                          <AutocompleteRecurso
                            value={recurso.descripcion}
                            onSelect={(r: Recurso) => handleSeleccionarRecurso(recurso.id_recurso_apu, r)}
                            placeholder="Buscar recurso..."
                            className="text-xs"
                          />
                        ) : (
                          <div
                            className={`flex items-center gap-1 ${recurso.esSubpartida && modoReal === 'edicion' ? 'cursor-pointer' : ''}`}
                            onClick={recurso.esSubpartida ? () => {
                              // Abrir modal con la subpartida (para ver en modo lectura o editar en modo edición)
                              if (onEditarSubPartida && recurso.id_partida_subpartida) {
                                // Pasar TODOS los datos guardados: recursos, id_partida_original, rendimiento, jornada, descripcion
                                onEditarSubPartida(
                                  recurso.id_partida_subpartida,
                                  recurso.recursosSubpartida || [],
                                  recurso.id_partida_original,
                                  recurso.rendimientoSubpartida,
                                  recurso.jornadaSubpartida,
                                  recurso.descripcion
                                );
                              }
                            } : undefined}
                            title={recurso.esSubpartida ? (modoReal === 'edicion' ? 'Clic para editar subpartida' : 'Clic para ver subpartida') : ''}
                          >
                            {(recurso.tipo_recurso || recurso.esSubpartida) && (
                              <span className={`px-1 py-0.5 rounded text-xs flex-shrink-0 ${getTipoRecursoColor(recurso.tipo_recurso || 'MATERIAL', recurso.esSubpartida)}`}>
                                {getTipoRecursoAbrev(recurso.tipo_recurso || 'MATERIAL', recurso.esSubpartida)}
                              </span>
                            )}
                            <span
                              className={`truncate ${recurso.esSubpartida && modoReal === 'edicion' ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
                              title={recurso.descripcion || ''}
                            >
                              {recurso.descripcion || '—'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center">
                        <span className="text-xs text-[var(--text-primary)]">{recurso.unidad_medida || '—'}</span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        {/* No mostrar cuadrilla para subpartidas */}
                        {(() => {
                          if (recurso.esSubpartida) {
                            return <span className="text-xs text-[var(--text-secondary)] italic"></span>;
                          }

                          const unidadMedidaLower = recurso.unidad_medida?.toLowerCase() || '';
                          const debeMostrarCuadrilla = (recurso.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
                            (recurso.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');

                          if (!debeMostrarCuadrilla) {
                            return <span className="text-xs text-[var(--text-secondary)] italic"></span>;
                          }

                          return modoReal === 'edicion' ? (
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
                              className="text-xs h-6 w-full text-center px-1"
                            />
                          ) : (
                            <span className="text-xs text-[var(--text-primary)]">{recurso.cuadrilla ?? '—'}</span>
                          );
                        })()}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {modoReal === 'edicion' ? (
                          (() => {
                            const esEquipoPorcentajeMo = recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo');
                            return (
                              <div className="relative inline-flex items-center justify-center w-full">
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
                                  className={`text-xs h-6 w-full text-center ${esEquipoPorcentajeMo ? 'pr-4' : 'px-1'}`}
                                />
                                {esEquipoPorcentajeMo && (
                                  <span className="absolute right-2 text-xs text-[var(--text-secondary)] pointer-events-none">%</span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-[var(--text-primary)]">
                            {recurso.cantidad?.toFixed(4) || '—'}
                            {recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo') && (
                              <span className="text-xs text-[var(--text-secondary)] ml-0.5">%</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {(() => {
                          const esEquipoPorcentajeMo = recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo');

                          // Para subpartidas o %mo, mostrar precio como texto de solo lectura
                          if ((recurso.esSubpartida && recurso.precio_unitario_subpartida !== undefined) || esEquipoPorcentajeMo) {
                            return (
                              <span className="text-xs text-[var(--text-primary)]">
                                {recurso.esSubpartida
                                  ? `S/ ${recurso.precio_unitario_subpartida !== undefined && recurso.precio_unitario_subpartida !== null ? recurso.precio_unitario_subpartida.toFixed(2) : '—'}`
                                  : `S/ ${recurso.precio !== undefined && recurso.precio !== null ? recurso.precio.toFixed(2) : '—'}`
                                }
                              </span>
                            );
                          }

                          return modoReal === 'edicion' ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={recurso.precio ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || value === '-') {
                                    handleUpdateRecurso(recurso.id_recurso_apu, 'precio', 0);
                                    // Si tiene override activado, actualizar también precio_override
                                    if (recurso.tiene_precio_override) {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'precio_override', 0 as number);
                                    }
                                    return;
                                  }
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    // Asegurar que se muestre con exactamente 2 decimales
                                    const roundedValue = roundToTwo(numValue);
                                    handleUpdateRecurso(recurso.id_recurso_apu, 'precio', roundedValue);
                                    // Si tiene override activado, actualizar también precio_override
                                    if (recurso.tiene_precio_override) {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'precio_override', roundedValue);
                                    }
                                  } else {
                                    // Si no es válido, restaurar el valor anterior
                                    handleUpdateRecurso(recurso.id_recurso_apu, 'precio', recurso.precio || 0);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const key = e.key;
                                  const currentValue = e.currentTarget.value;
                                  const parts = currentValue.split('.');
                                  const hasDecimal = parts.length > 1;
                                  const decimalsCount = hasDecimal ? parts[1].length : 0;

                                  // Prevenir entrada de caracteres no numéricos excepto punto y teclas de control
                                  const isNumber = /^\d$/.test(key);
                                  const isDecimal = key === '.' && !hasDecimal;
                                  const isControl = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key);
                                  const isPaste = (e.ctrlKey || e.metaKey) && key === 'v';

                                  // Si ya hay 2 decimales y se intenta escribir un número, bloquear
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
                                    // Si tiene override activado, actualizar también precio_override
                                    if (recurso.tiene_precio_override) {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'precio_override', roundedValue);
                                    }
                                  }
                                }}
                                className="text-xs h-6 w-20 text-center px-1"
                                title="Precio unitario (máximo 2 decimales)"
                              />
                              <label className="flex items-center gap-1 cursor-pointer group" title="Precio único (no afecta precio compartido)">
                                <input
                                  type="checkbox"
                                  checked={recurso.tiene_precio_override || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    handleUpdateRecurso(recurso.id_recurso_apu, 'tiene_precio_override', checked);

                                    // Si se activa, copiar el precio actual a precio_override
                                    if (checked) {
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'precio_override', recurso.precio || 0);
                                    } else {
                                      // Si se desactiva, limpiar precio_override
                                      handleUpdateRecurso(recurso.id_recurso_apu, 'precio_override', null);
                                    }
                                  }}
                                  className="w-3 h-3 cursor-pointer accent-[var(--primary-color)]"
                                />
                                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                                  Único
                                </span>
                              </label>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-xs text-[var(--text-primary)]">
                                {recurso.esSubpartida
                                  ? `S/ ${recurso.precio_unitario_subpartida !== undefined && recurso.precio_unitario_subpartida !== null ? recurso.precio_unitario_subpartida.toFixed(2) : '—'}`
                                  : `S/ ${recurso.precio !== undefined && recurso.precio !== null ? recurso.precio.toFixed(2) : '—'}`
                                }
                              </span>
                              {!recurso.esSubpartida && !esEquipoPorcentajeMo && recurso.tiene_precio_override && (
                                <span className="text-xs text-[var(--text-secondary)] italic" title="Precio único">
                                  (Único)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-1 py-1 text-right font-medium text-[var(--text-primary)]">
                        <span>S/ {recurso.parcial !== undefined && recurso.parcial !== null ? roundToTwo(recurso.parcial).toFixed(2) : '0.00'}</span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        {modoReal === 'edicion' && (
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
                {!hasPartida && (
                  <tr>
                    <td colSpan={7} className="px-1 py-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          className="w-6 h-6 opacity-30 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-xs text-[var(--text-secondary)] italic">
                          Seleccione una partida para ver sus detalles
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {hasPartida && recursosEditables.length === 0 && !isLoadingApu && (
              <div className="text-center py-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  No hay recursos asignados. Haga clic en "Agregar Insumo" para comenzar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER FIJO - Botones de Acción */}
      {modoReal === 'edicion' && (
        <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--card-bg)] px-2 py-1.5 card-shadow">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAgregarInsumo}
              disabled={!hasPartida || isLoading || esPartidaNoGuardada}
              className="flex items-center gap-1.5 text-xs h-6 px-2 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar insumos" : undefined}
            >
              <Plus className="h-3 w-3" />
              Agregar Insumo
            </button>
            <button
              onClick={onAgregarSubPartida}
              disabled={!hasPartida || isLoading || esPartidaNoGuardada}
              className="flex items-center gap-1.5 text-xs h-6 px-2 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar subpartidas" : !hasPartida ? "Seleccione una partida primero" : undefined}
            >
              <Plus className="h-3 w-3" />
              Agregar Sub Partida
            </button>
            <div className="flex-1" />
            <button
              onClick={handleCancelarCambios}
              disabled={!hasPartida || isLoading || !hasChanges || esPartidaNoGuardada || !valoresOriginales}
              className="flex items-center gap-1.5 text-xs h-6 px-2 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cancelar cambios y restaurar valores originales"
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
            <button
              onClick={handleGuardarCambios}
              disabled={!hasPartida || isLoading || !hasChanges || esPartidaNoGuardada}
              className="flex items-center gap-1.5 text-xs h-6 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar recursos al APU" : undefined}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar Cambios APU'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

