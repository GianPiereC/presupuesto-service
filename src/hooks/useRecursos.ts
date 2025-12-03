import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/services/graphql-client';
import { LIST_RECURSOS_PAGINATED_QUERY } from '@/graphql/queries/recurso.queries';

export interface Unidad {
  nombre?: string;
  unidad_id?: string;
  descripcion?: string;
}

export interface TipoRecurso {
  nombre?: string;
  codigo?: string;
}

export interface TipoCostoRecurso {
  nombre?: string;
  codigo?: string;
}

export interface ClasificacionRecurso {
  nombre?: string;
  parent_id?: string;
}

export interface ImagenRecurso {
  id: string;
  file: string;
}

export interface Recurso {
  id: string;
  recurso_id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  cantidad?: number;
  unidad_id?: string;
  unidad?: Unidad;
  precio_actual?: number;
  tipo_recurso_id?: string;
  tipo_recurso?: TipoRecurso;
  tipo_costo_recurso_id?: string;
  tipo_costo_recurso?: TipoCostoRecurso;
  clasificacion_recurso_id?: string;
  clasificacion_recurso?: ClasificacionRecurso;
  fecha?: string;
  vigente?: boolean;
  usado?: boolean;
  imagenes?: ImagenRecurso[];
  activo_fijo?: boolean;
  combustible_ids?: string[];
  estado_activo_fijo?: string;
  fecha_checked_activo_fijo?: string;
}

export interface RecursoPaginationInfo {
  page: number;
  total: number;
  itemsPage: number;
  pages: number;
}

export interface ListRecursoPaginationResponse {
  info: RecursoPaginationInfo;
  status: string;
  message?: string;
  recursos: Recurso[];
}

export interface ListRecursoPaginationInput {
  page?: number;
  itemsPage?: number;
  searchTerm?: string;
  estado_activo_fijo?: string;
  filterRangeDate?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Hook para obtener recursos paginados
 */
export function useRecursosPaginated(input?: ListRecursoPaginationInput) {
  return useQuery({
    queryKey: ['recursos', 'paginated', input],
    queryFn: async () => {
      const response = await executeQuery<{ listRecursosPaginated: ListRecursoPaginationResponse }>(
        LIST_RECURSOS_PAGINATED_QUERY,
        { input: input || {} }
      );
      return response.listRecursosPaginated;
    },
    enabled: true,
    staleTime: 30000, // 30 segundos
  });
}

