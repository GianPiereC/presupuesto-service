import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/services/graphql-client';
import { LIST_ESPECIALIDADES_QUERY, GET_ESPECIALIDAD_QUERY } from '@/graphql/queries/especialidad.queries';

export interface Especialidad {
  _id?: string;
  id_especialidad: string;
  nombre: string;
  descripcion: string;
}

/**
 * Hook para obtener todas las especialidades
 * Solo se consulta una vez y se cachea por 5 minutos
 */
export function useEspecialidades() {
  return useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      const response = await executeQuery<{ listEspecialidades: Especialidad[] }>(
        LIST_ESPECIALIDADES_QUERY,
        {}
      );
      return response.listEspecialidades;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - los datos se consideran frescos por 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos - tiempo que se mantiene en cache (antes era cacheTime)
    refetchOnMount: false, // No refetch cuando el componente se monta si los datos están frescos
    refetchOnWindowFocus: false, // No refetch cuando la ventana recupera el foco
    refetchOnReconnect: false, // No refetch cuando se reconecta
  });
}

/**
 * Hook para obtener una especialidad por ID
 */
export function useEspecialidad(id_especialidad: string | null) {
  return useQuery({
    queryKey: ['especialidad', id_especialidad],
    queryFn: async () => {
      if (!id_especialidad) return null;
      const response = await executeQuery<{ getEspecialidad: Especialidad }>(
        GET_ESPECIALIDAD_QUERY,
        { id_especialidad }
      );
      return response.getEspecialidad;
    },
    enabled: !!id_especialidad,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

