'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { GET_PRECIO_RECURSO_BY_PRESUPUESTO_Y_RECURSO } from '@/graphql/queries';
import {
  ADD_RECURSO_TO_APU_MUTATION,
  UPDATE_RECURSO_IN_APU_MUTATION,
  REMOVE_RECURSO_FROM_APU_MUTATION,
  UPDATE_APU_MUTATION,
} from '@/graphql/mutations/apu.mutations';
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
}

interface DetallePartidaPanelProps {
  id_partida: string | null;
  id_presupuesto?: string;
  id_proyecto?: string;
  partida?: Partida | null;
  onAgregarInsumo?: () => void;
  onAgregarSubPartida?: () => void;
  onGuardarCambios?: () => void;
  modo?: 'edicion' | 'lectura' | 'meta' | 'licitacion' | 'contractual';
}

export default function DetallePartidaPanel({
  id_partida,
  id_presupuesto,
  id_proyecto,
  partida,
  onAgregarInsumo,
  onAgregarSubPartida,
  onGuardarCambios,
  modo = 'edicion',
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
      const recursosEditable: RecursoAPUEditable[] = apuData.recursos.map((r, index) => ({
        id_recurso_apu: r.id_recurso_apu,
        recurso_id: r.recurso_id,
        codigo_recurso: r.codigo_recurso,
        descripcion: r.descripcion,
        tipo_recurso: r.tipo_recurso,
        unidad_medida: r.unidad_medida,
        id_precio_recurso: r.id_precio_recurso,
        precio: r.precio || 0,
        cuadrilla: r.cuadrilla,
        cantidad: r.cantidad,
        desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
        parcial: r.parcial,
        orden: r.orden,
        esNuevo: false,
      }));
      setRecursosEditables(recursosEditable);
      // Guardar valores originales
      setValoresOriginales({
        rendimiento: nuevoRendimiento,
        jornada: nuevaJornada,
        recursos: JSON.parse(JSON.stringify(recursosEditable))
      });
      setHasChanges(false);
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

  const handleUpdateRecurso = (recursoId: string, campo: keyof RecursoAPUEditable, valor: string | number | null) => {
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
          const numValor = typeof valor === 'string' ? parseFloat(valor) || 0 : (valor || 0);
          const nuevoRecurso = { ...r };
          
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
            } else if (campo === 'desperdicio_porcentaje') {
              nuevoRecurso.desperdicio_porcentaje = truncateToFour(numValor);
            } else {
              (nuevoRecurso as any)[campo] = numValor;
            }
          } else {
            // Para MATERIAL y SUBCONTRATO: lógica normal (sin sincronización cantidad-cuadrilla)
            if (campo === 'cantidad') {
              nuevoRecurso.cantidad = truncateToFour(numValor);
            } else if (campo === 'precio') {
              nuevoRecurso.precio = roundToTwo(numValor);
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
  
  const handleEliminarRecurso = async (recursoId: string) => {
    try {
      // Filtrar el recurso localmente primero
      setRecursosEditables(prev => prev.filter(r => r.id_recurso_apu !== recursoId));

      // Si no hay APU aún, solo marcar cambios
      const { data: apuDataActualizado } = await refetchApu();
      const apuExiste = apuDataActualizado || apuData;

      if (!apuExiste) {
        setHasChanges(true);
        return;
      }

      // Eliminar el recurso del backend
      await executeMutation<{ removeRecursoFromApu: any }>(
        REMOVE_RECURSO_FROM_APU_MUTATION,
        {
          id_apu: apuExiste.id_apu,
          id_recurso_apu: recursoId,
        }
      );

      // Invalidar queries y refetch para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['apu'] });
      await refetchApu();

      // Marcar que se guardaron cambios
      setHasChanges(false);

      // Notificar al componente padre que se guardaron cambios
      if (onGuardarCambios) {
        onGuardarCambios();
      }

      toast.success('Recurso eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar recurso:', error);
      toast.error('Error al eliminar el recurso');

      // Revertir el cambio local en caso de error
      const { data: apuDataActualizado } = await refetchApu();
      if (apuDataActualizado) {
        setRecursosEditables(apuDataActualizado.recursos.map(r => ({
          ...r,
          parcial: calcularParcial({
            ...r,
            tipo_recurso: r.tipo_recurso as TipoRecursoApu,
          }),
        })));
      }
    }
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
      const recursosInput: RecursoApuInput[] = recursosEditables
        .filter(r => r.recurso_id && r.descripcion)
        .map((r, index) => ({
            recurso_id: r.recurso_id,
            codigo_recurso: r.codigo_recurso,
            descripcion: r.descripcion,
            unidad_medida: r.unidad_medida,
            tipo_recurso: r.tipo_recurso,
            tipo_recurso_codigo: r.tipo_recurso,
            id_precio_recurso: r.id_precio_recurso,
            precio_usuario: roundToTwo(r.precio), // Asegurar que se guarde con 2 decimales
            cuadrilla: r.cuadrilla ? truncateToFour(r.cuadrilla) : undefined, // Cuadrilla con 4 decimales
            cantidad: truncateToFour(r.cantidad), // Cantidad con 4 decimales
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: truncateToFour(r.cantidad * (1 + (r.desperdicio_porcentaje || 0) / 100)),
            parcial: roundToTwo(r.parcial), // Parcial con 2 decimales
            orden: index,
          }));

      // Variables para tracking de cambios
      let recursosAEliminar: any[] = [];
      let recursosNuevos: RecursoApuInput[] = [];
      let recursosActualizados: Array<{ id_recurso_apu: string; recurso: RecursoApuInput }> = [];

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
            editable.orden !== existente.orden
          );
        };

        // Identificar recursos a eliminar
        recursosAEliminar = recursosExistentes.filter(
          r => !recursosNuevosIds.has(r.id_recurso_apu)
        );

        // Identificar recursos nuevos y actualizados
        recursosNuevos = [];
        recursosActualizados = [];

        for (const recursoEditable of recursosEditables.filter(r => r.recurso_id && r.descripcion)) {
          const recursoExistente = recursosExistentes.find(
            r => r.id_recurso_apu === recursoEditable.id_recurso_apu
          );

          const recursoInput: RecursoApuInput = {
            recurso_id: recursoEditable.recurso_id,
            codigo_recurso: recursoEditable.codigo_recurso,
            descripcion: recursoEditable.descripcion,
            unidad_medida: recursoEditable.unidad_medida,
            tipo_recurso: recursoEditable.tipo_recurso,
            tipo_recurso_codigo: recursoEditable.tipo_recurso,
            id_precio_recurso: recursoEditable.id_precio_recurso,
            precio_usuario: roundToTwo(recursoEditable.precio), // Asegurar que se guarde con 2 decimales
            cuadrilla: recursoEditable.cuadrilla ? truncateToFour(recursoEditable.cuadrilla) : undefined, // Cuadrilla con 4 decimales
            cantidad: truncateToFour(recursoEditable.cantidad), // Cantidad con 4 decimales
            desperdicio_porcentaje: recursoEditable.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: truncateToFour(recursoEditable.cantidad * (1 + (recursoEditable.desperdicio_porcentaje || 0) / 100)),
            parcial: roundToTwo(recursoEditable.parcial), // Parcial con 2 decimales
            orden: recursoEditable.orden,
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

        // Eliminar recursos
        for (const recurso of recursosAEliminar) {
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

      await refetchApu();
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
      
      // Actualizar valores originales después de guardar
      if (apuData) {
        setValoresOriginales({
          rendimiento: rendimiento,
          jornada: jornada,
          recursos: JSON.parse(JSON.stringify(recursosEditables))
        });
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
    }
  };

  const totales = useMemo(() => {
    return recursosEditables.reduce((acc, r) => ({
      costo_materiales: acc.costo_materiales + (r.tipo_recurso === 'MATERIAL' ? r.parcial : 0),
      costo_mano_obra: acc.costo_mano_obra + (r.tipo_recurso === 'MANO_OBRA' ? r.parcial : 0),
      costo_equipos: acc.costo_equipos + (r.tipo_recurso === 'EQUIPO' ? r.parcial : 0),
      costo_subcontratos: acc.costo_subcontratos + (r.tipo_recurso === 'SUBCONTRATO' ? r.parcial : 0),
      costo_directo: acc.costo_directo + r.parcial,
    }), {
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_equipos: 0,
      costo_subcontratos: 0,
      costo_directo: 0,
    });
  }, [recursosEditables]);

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

  const isLoading = isLoadingApu || createApu.isPending || updateApu.isPending || 
                     addRecursoToApu.isPending || updateRecursoInApu.isPending || 
                     removeRecursoFromApu.isPending;

  return (
    <div className="h-full flex flex-col bg-[var(--background)] border-t border-[var(--border-color)]">
      {/* HEADER FIJO - Datos de Partida y APU */}
      <div className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)] relative z-0 table-header-shadow">
        {/* Datos de Partida */}
        <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <div className="flex items-center">
              <span className="text-[var(--text-secondary)]">Partida:</span>
              <span className={`ml-1 font-medium ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                {hasPartida ? partida!.descripcion : '—'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-[var(--text-secondary)]">Item:</span>
              <span className={`ml-1 font-mono ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                {hasPartida ? partida!.numero_item : '—'}
              </span>
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
                  className="text-[10px] h-6 w-16 text-center px-1"
                />
              ) : (
                <span className={`ml-1 ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                  {hasPartida ? partida!.unidad_medida : '—'}
                </span>
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
                  className="text-[10px] h-6 w-16 text-center px-1"
                />
              ) : (
                <span className={`ml-1 ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                  {hasPartida ? partida!.metrado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </span>
              )}
            </div>
            <div className="flex items-center">
              <span className="text-[var(--text-secondary)]">Estado:</span>
              <span className={`ml-1 font-medium ${hasPartida ? (partida!.estado === 'Activa' ? 'text-green-600' : 'text-gray-500') : 'text-[var(--text-secondary)] italic'}`}>
                {hasPartida ? partida!.estado : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Datos de APU - Rendimiento y Jornada */}
        <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
          <div className="grid grid-cols-4 gap-2 text-[10px]">
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
                  className="text-[10px] h-6 w-16 text-center px-1"
                />
              ) : (
                <span className={`${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                  {hasPartida ? rendimiento.toFixed(4) : '—'}
                </span>
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
                  className="text-[10px] h-6 w-16 text-center px-1"
                />
              ) : (
                <span className={`${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                  {hasPartida ? `${jornada.toFixed(4)} h` : '—'}
                </span>
              )}
              <span className="text-[8px] text-[var(--text-secondary)]">h</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Precio Unit.:</span>
              <span className={`ml-1 font-medium ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                {hasPartida ? `S/ ${partida!.precio_unitario.toFixed(2)}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Costo Directo:</span>
              <span className={`ml-1 font-medium ${hasPartida ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                {hasPartida ? `S/ ${totales.costo_directo.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Resumen de Costos */}
        <div className="px-2 py-1.5 table-header-shadow">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)]">Resumen:</span>
            {hasPartida ? (
              <div className="flex gap-1.5">
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('MANO_OBRA')}`}>
                  MO: S/ {totales.costo_mano_obra.toFixed(2)}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('MATERIAL')}`}>
                  MT: S/ {totales.costo_materiales.toFixed(2)}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('EQUIPO')}`}>
                  EQ: S/ {totales.costo_equipos.toFixed(2)}
                </div>
                {totales.costo_subcontratos > 0 && (
                  <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTipoRecursoColor('SUBCONTRATO')}`}>
                    SC: S/ {totales.costo_subcontratos.toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[9px] text-[var(--text-secondary)] italic">—</span>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO CON SCROLL - Tabla de Recursos APU */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {esPartidaNoGuardada ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 max-w-xs">
              <div className="mb-2">
                <svg className="w-8 h-8 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mb-2">
                Está modificando la estructura del presupuesto.
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
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
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-[var(--card-bg)] z-10 table-header-shadow">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-1 py-1 text-left font-medium text-[var(--text-secondary)] uppercase w-[35%]">Insumo</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">Und.</th>
                  <th className="px-1 py-1 text-center font-medium text-[var(--text-secondary)] uppercase w-[8%]">Cuad.</th>
                  <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[12%]">Cantidad</th>
                  <th className="px-1 py-1 text-right font-medium text-[var(--text-secondary)] uppercase w-[12%]">P.U.</th>
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
                      <td className="px-1 py-1">
                        {modoReal === 'edicion' && recurso.enEdicion && !recurso.recurso_id ? (
                          <AutocompleteRecurso
                            value={recurso.descripcion}
                            onSelect={(r: Recurso) => handleSeleccionarRecurso(recurso.id_recurso_apu, r)}
                            placeholder="Buscar recurso..."
                            className="text-[10px]"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            {recurso.tipo_recurso && (
                              <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${getTipoRecursoColor(recurso.tipo_recurso)}`}>
                                {getTipoRecursoAbrev(recurso.tipo_recurso)}
                              </span>
                            )}
                            <span className="text-[var(--text-primary)] truncate" title={recurso.descripcion || ''}>
                              {recurso.descripcion || '—'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {modoReal === 'edicion' ? (
                          <Input
                            type="text"
                            value={recurso.unidad_medida || ''}
                            onChange={(e) => handleUpdateRecurso(recurso.id_recurso_apu, 'unidad_medida', e.target.value)}
                            className="text-[10px] h-6 w-full text-center px-1"
                          />
                        ) : (
                          <span className="text-[10px] text-[var(--text-primary)]">{recurso.unidad_medida || '—'}</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {/* Mostrar cuadrilla solo para MO con unidad "hh" y EQUIPO con unidad "hm" */}
                        {(() => {
                          const unidadMedidaLower = recurso.unidad_medida?.toLowerCase() || '';
                          const debeMostrarCuadrilla = (recurso.tipo_recurso === 'MANO_OBRA' && unidadMedidaLower === 'hh') ||
                            (recurso.tipo_recurso === 'EQUIPO' && unidadMedidaLower === 'hm');
                          
                          if (!debeMostrarCuadrilla) {
                            return <span className="text-[10px] text-[var(--text-secondary)] italic"></span>;
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
                              className="text-[10px] h-6 w-full text-center px-1"
                            />
                          ) : (
                            <span className="text-[10px] text-[var(--text-primary)]">{recurso.cuadrilla ?? '—'}</span>
                          );
                        })()}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {modoReal === 'edicion' ? (
                          (() => {
                            const esEquipoPorcentajeMo = recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo');
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
                                  className={`text-[10px] h-6 w-full text-right ${esEquipoPorcentajeMo ? 'pr-4' : 'px-1'}`}
                            />
                                {esEquipoPorcentajeMo && (
                                  <span className="absolute right-2 text-[9px] text-[var(--text-secondary)] pointer-events-none">%</span>
                            )}
                          </div>
                            );
                          })()
                        ) : (
                          <span className="text-[10px] text-[var(--text-primary)]">
                            {recurso.cantidad?.toFixed(4) || '—'}
                            {recurso.tipo_recurso === 'EQUIPO' && (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo') && (
                              <span className="text-[9px] text-[var(--text-secondary)] ml-0.5">%</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {modoReal === 'edicion' ? (
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
                                // Asegurar que se muestre con exactamente 2 decimales
                                const roundedValue = roundToTwo(numValue);
                                handleUpdateRecurso(recurso.id_recurso_apu, 'precio', roundedValue);
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
                              }
                            }}
                            className="text-[10px] h-6 w-full text-right px-1"
                            title="Precio unitario (máximo 2 decimales)"
                          />
                        ) : (
                          <span className="text-[10px] text-[var(--text-primary)]">S/ {recurso.precio !== undefined && recurso.precio !== null ? recurso.precio.toFixed(2) : '—'}</span>
                        )}
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
                        <p className="text-[10px] text-[var(--text-secondary)] italic">
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
                <p className="text-[10px] text-[var(--text-secondary)]">
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleAgregarInsumo}
              disabled={!hasPartida || isLoading || esPartidaNoGuardada}
              className="flex items-center gap-1 h-6 px-2 text-[10px]"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar insumos" : undefined}
            >
              <Plus className="h-3 w-3" />
              Agregar Insumo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAgregarSubPartida}
              disabled={isLoading || esPartidaNoGuardada}
              className="flex items-center gap-1 h-6 px-2 text-[10px]"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar subpartidas" : undefined}
            >
              <Plus className="h-3 w-3" />
              Agregar Sub Partida
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelarCambios}
              disabled={!hasPartida || isLoading || !hasChanges || esPartidaNoGuardada || !valoresOriginales}
              className="flex items-center gap-1 h-6 px-2 text-[10px] border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              title="Cancelar cambios y restaurar valores originales"
            >
              <X className="h-3 w-3" />
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleGuardarCambios}
              disabled={!hasPartida || isLoading || !hasChanges || esPartidaNoGuardada}
              className="flex items-center gap-1 h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              title={esPartidaNoGuardada ? "Guarde la partida antes de agregar recursos al APU" : undefined}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Guardar Cambios APU
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
