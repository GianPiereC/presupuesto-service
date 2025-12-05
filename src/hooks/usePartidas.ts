import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import { CREATE_PARTIDA_MUTATION, UPDATE_PARTIDA_MUTATION, DELETE_PARTIDA_MUTATION } from '@/graphql/mutations/partida.mutations';
import toast from 'react-hot-toast';

export type EstadoPartida = 'Activa' | 'Inactiva';

export interface Partida {
  _id?: string;
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
  estado: EstadoPartida;
}

export interface PartidaInput {
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre?: string | null;
  nivel_partida: number;
  numero_item: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida?: number;
  orden: number;
  estado?: EstadoPartida;
}

export interface PartidaUpdateInput {
  id_partida: string;
  id_titulo?: string;
  id_partida_padre?: string | null;
  nivel_partida?: number;
  numero_item?: string;
  descripcion?: string;
  unidad_medida?: string;
  metrado?: number;
  precio_unitario?: number;
  parcial_partida?: number;
  orden?: number;
  estado?: EstadoPartida;
}

/**
 * Hook para crear una partida
 */
export function useCreatePartida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PartidaInput) => {
      const response = await executeMutation<{ createPartida: Partida }>(
        CREATE_PARTIDA_MUTATION,
        input
      );
      return response.createPartida;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['partidas', 'presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['partidas'] });
      toast.success('Partida creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la partida');
    },
  });
}

/**
 * Hook para actualizar una partida
 */
export function useUpdatePartida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PartidaUpdateInput) => {
      const response = await executeMutation<{ updatePartida: Partida }>(
        UPDATE_PARTIDA_MUTATION,
        input
      );
      return response.updatePartida;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['partidas', 'presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['partidas'] });
      toast.success('Partida actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar la partida');
    },
  });
}

/**
 * Hook para eliminar una partida
 */
export function useDeletePartida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_partida: string) => {
      const response = await executeMutation<{ deletePartida: Partida | null }>(
        DELETE_PARTIDA_MUTATION,
        { id_partida }
      );
      // Si el backend devuelve null, significa que se eliminó correctamente
      // o que no existía. En cualquier caso, consideramos éxito
      return id_partida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto'] });
      queryClient.invalidateQueries({ queryKey: ['partidas'] });
      toast.success('Partida eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar la partida');
    },
  });
}

