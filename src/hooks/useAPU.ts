import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import {
  GET_APU_BY_PARTIDA_QUERY,
  GET_APU_QUERY,
  GET_APUS_BY_PRESUPUESTO_QUERY,
} from '@/graphql/queries/apu.queries';
import {
  CREATE_APU_MUTATION,
  UPDATE_APU_MUTATION,
  ADD_RECURSO_TO_APU_MUTATION,
  UPDATE_RECURSO_IN_APU_MUTATION,
  REMOVE_RECURSO_FROM_APU_MUTATION,
} from '@/graphql/mutations/apu.mutations';
import toast from 'react-hot-toast';

export type TipoRecursoApu = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';

export interface RecursoApu {
  id_recurso_apu: string;
  recurso_id: string;
  codigo_recurso: string;
  descripcion: string;
  unidad_medida: string;
  tipo_recurso: TipoRecursoApu;
  id_precio_recurso: string | null;
  precio: number;
  cuadrilla?: number;
  cantidad: number;
  desperdicio_porcentaje: number;
  cantidad_con_desperdicio: number;
  parcial: number;
  orden: number;
}

export interface Apu {
  _id?: string;
  id_apu: string;
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  rendimiento: number;
  jornada: number;
  costo_materiales: number;
  costo_mano_obra: number;
  costo_equipos: number;
  costo_subcontratos: number;
  costo_directo: number;
  recursos: RecursoApu[];
}

export interface RecursoApuInput {
  recurso_id: string;
  codigo_recurso: string;
  descripcion: string;
  unidad_medida: string;
  tipo_recurso: TipoRecursoApu;
  tipo_recurso_codigo?: string;
  id_precio_recurso?: string | null; // Se asigna automáticamente en el backend
  precio_usuario: number; // Precio que el usuario ingresa
  cuadrilla?: number;
  cantidad: number;
  desperdicio_porcentaje: number;
  cantidad_con_desperdicio: number;
  parcial: number;
  orden: number;
}

export interface CreateApuInput {
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  rendimiento: number;
  jornada?: number;
  recursos: RecursoApuInput[];
}

export interface UpdateApuInput {
  id_apu: string;
  rendimiento?: number;
  jornada?: number;
}

/**
 * Hook para obtener APU por partida
 */
export function useApuByPartida(id_partida: string | null) {
  return useQuery({
    queryKey: ['apu', 'partida', id_partida],
    queryFn: async () => {
      if (!id_partida) return null;
      const response = await executeQuery<{ getApuByPartida: Apu | null }>(
        GET_APU_BY_PARTIDA_QUERY,
        { id_partida }
      );
      return response.getApuByPartida;
    },
    enabled: !!id_partida,
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener APU por ID
 */
export function useApu(id_apu: string | null) {
  return useQuery({
    queryKey: ['apu', id_apu],
    queryFn: async () => {
      if (!id_apu) return null;
      const response = await executeQuery<{ getApu: Apu | null }>(
        GET_APU_QUERY,
        { id_apu }
      );
      return response.getApu;
    },
    enabled: !!id_apu,
    staleTime: 30000,
  });
}

/**
 * Hook para obtener APUs por presupuesto
 */
export function useApusByPresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['apus', 'presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return [];
      const response = await executeQuery<{ getApusByPresupuesto: Apu[] }>(
        GET_APUS_BY_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      return response.getApusByPresupuesto;
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

/**
 * Hook para crear un APU
 */
export function useCreateApu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApuInput) => {
      const response = await executeMutation<{ createApu: Apu }>(
        CREATE_APU_MUTATION,
        input
      );
      return response.createApu;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apu'] });
      queryClient.invalidateQueries({ queryKey: ['apus'] }); // Invalida todas las listas
      toast.success('APU creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el APU');
    },
  });
}

/**
 * Hook para actualizar un APU
 */
export function useUpdateApu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateApuInput) => {
      const response = await executeMutation<{ updateApu: Apu | null }>(
        UPDATE_APU_MUTATION,
        input
      );
      return response.updateApu;
    },
    onSuccess: (data) => {
      if (data) {
        // 🔄 Invalidar cache para refrescar datos
        queryClient.invalidateQueries({ queryKey: ['apu'] });
        queryClient.invalidateQueries({ queryKey: ['apus'] });
        toast.success('APU actualizado exitosamente');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el APU');
    },
  });
}

/**
 * Hook para agregar recurso a un APU
 */
export function useAddRecursoToApu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id_apu, recurso }: { id_apu: string; recurso: RecursoApuInput }) => {
      const response = await executeMutation<{ addRecursoToApu: Apu }>(
        ADD_RECURSO_TO_APU_MUTATION,
        { id_apu, recurso }
      );
      return response.addRecursoToApu;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apu'] });
      queryClient.invalidateQueries({ queryKey: ['apus'] }); // Invalida todas las listas
      toast.success('Recurso agregado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al agregar el recurso');
    },
  });
}

/**
 * Hook para actualizar recurso en un APU
 */
export function useUpdateRecursoInApu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id_apu,
      id_recurso_apu,
      recurso,
    }: {
      id_apu: string;
      id_recurso_apu: string;
      recurso: RecursoApuInput;
    }) => {
      const response = await executeMutation<{ updateRecursoInApu: Apu }>(
        UPDATE_RECURSO_IN_APU_MUTATION,
        { id_apu, id_recurso_apu, recurso }
      );
      return response.updateRecursoInApu;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apu'] });
      queryClient.invalidateQueries({ queryKey: ['apus'] }); // Invalida todas las listas
      toast.success('Recurso actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el recurso');
    },
  });
}

/**
 * Hook para eliminar recurso de un APU
 */
export function useRemoveRecursoFromApu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id_apu, id_recurso_apu }: { id_apu: string; id_recurso_apu: string }) => {
      const response = await executeMutation<{ removeRecursoFromApu: Apu }>(
        REMOVE_RECURSO_FROM_APU_MUTATION,
        { id_apu, id_recurso_apu }
      );
      return response.removeRecursoFromApu;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apu', 'partida', data.id_partida] });
      queryClient.invalidateQueries({ queryKey: ['apu', data.id_apu] });
      queryClient.invalidateQueries({ queryKey: ['apus', 'presupuesto', data.id_presupuesto] });
      toast.success('Recurso eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el recurso');
    },
  });
}

