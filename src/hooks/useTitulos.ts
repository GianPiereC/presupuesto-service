import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import { GET_TITULOS_BY_PRESUPUESTO_QUERY, GET_TITULO_QUERY } from '@/graphql/queries/titulo.queries';
import { CREATE_TITULO_MUTATION, UPDATE_TITULO_MUTATION, DELETE_TITULO_MUTATION } from '@/graphql/mutations/titulo.mutations';
import toast from 'react-hot-toast';

export type TipoTitulo = 'TITULO' | 'SUBTITULO';

export interface Titulo {
  _id?: string;
  id_titulo: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: TipoTitulo;
  orden: number;
  total_parcial: number;
  id_especialidad?: string | null;
}

export interface TituloInput {
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre?: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: TipoTitulo;
  orden: number;
  total_parcial?: number;
  id_especialidad?: string | null;
}

export interface TituloUpdateInput {
  id_titulo: string;
  id_titulo_padre?: string | null;
  nivel?: number;
  numero_item?: string;
  descripcion?: string;
  tipo?: TipoTitulo;
  orden?: number;
  total_parcial?: number;
  id_especialidad?: string | null;
}

/**
 * Hook para obtener títulos por presupuesto
 */
export function useTitulosByPresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['titulos', 'presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return [];
      const response = await executeQuery<{ getTitulosByPresupuesto: Titulo[] }>(
        GET_TITULOS_BY_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      return response.getTitulosByPresupuesto;
    },
    enabled: !!id_presupuesto,
  });
}

/**
 * Hook para obtener un título por ID
 */
export function useTitulo(id_titulo: string | null) {
  return useQuery({
    queryKey: ['titulo', id_titulo],
    queryFn: async () => {
      if (!id_titulo) return null;
      const response = await executeQuery<{ getTitulo: Titulo }>(
        GET_TITULO_QUERY,
        { id_titulo }
      );
      return response.getTitulo;
    },
    enabled: !!id_titulo,
  });
}

/**
 * Hook para crear un título
 */
export function useCreateTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TituloInput) => {
      const response = await executeMutation<{ createTitulo: Titulo }>(
        CREATE_TITULO_MUTATION,
        input
      );
      return response.createTitulo;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['titulos', 'presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Título creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el título');
    },
  });
}

/**
 * Hook para actualizar un título
 */
export function useUpdateTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TituloUpdateInput & { id_titulo: string }) => {
      const response = await executeMutation<{ updateTitulo: Titulo }>(
        UPDATE_TITULO_MUTATION,
        input
      );
      return response.updateTitulo;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['titulos', 'presupuesto', data.id_presupuesto] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['titulo', data.id_titulo] });
      toast.success('Título actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el título');
    },
  });
}


/**
 * Hook para eliminar un título
 */
export function useDeleteTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_titulo: string) => {
      const response = await executeMutation<{ deleteTitulo: Titulo | null }>(
        DELETE_TITULO_MUTATION,
        { id_titulo }
      );
      // Si el backend devuelve null, significa que se eliminó correctamente
      // o que no existía. En cualquier caso, consideramos éxito
      return id_titulo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Título eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el título');
    },
  });
}


