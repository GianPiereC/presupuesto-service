import { executeQuery, executeMutation } from './graphql-client';
import {
  LIST_PROYECTOS_PAGINATED_QUERY,
  GET_PROYECTO_QUERY,
} from '@/graphql/queries/proyecto.queries';
import {
  ADD_PROYECTO_MUTATION,
  UPDATE_PROYECTO_MUTATION,
  DELETE_PROYECTO_MUTATION,
} from '@/graphql/mutations/proyecto.mutations';

export interface Proyecto {
  _id: string;
  id_proyecto: string;
  id_usuario: string;
  id_infraestructura: string;
  nombre_proyecto: string;
  id_departamento: string;
  id_provincia: string;
  id_distrito: string;
  id_localidad?: string;
  total_proyecto?: number;
  estado: string;
  fecha_creacion: string;
  fecha_ultimo_calculo?: string;
  cliente: string;
  empresa: string;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  jornada: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedProyectoResponse {
  data: Proyecto[];
  pagination: PaginationInfo;
}

export interface PaginationFilterInput {
  pagination?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  filters?: Array<{
    field: string;
    value: any;
    operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  }>;
  search?: {
    query?: string;
    fields?: string[];
  };
}

export interface ProyectoInput {
  id_usuario: string;
  id_infraestructura: string;
  nombre_proyecto: string;
  id_departamento: string;
  id_provincia: string;
  id_distrito: string;
  id_localidad?: string;
  total_proyecto?: number;
  estado: string;
  cliente: string;
  empresa: string;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  jornada: number;
}

export interface ProyectoUpdateInput {
  id_proyecto: string;
  nombre_proyecto?: string;
  estado?: string;
  total_proyecto?: number;
  cliente?: string;
  empresa?: string;
  plazo?: number;
  ppto_base?: number;
  ppto_oferta?: number;
  jornada?: number;
  id_departamento?: string;
  id_distrito?: string;
  id_infraestructura?: string;
  id_localidad?: string;
  id_provincia?: string;
}

class ProyectoService {
  /**
   * Lista proyectos con paginación, filtros y búsqueda
   */
  async listProyectosPaginated(input?: PaginationFilterInput): Promise<PaginatedProyectoResponse> {
    const response = await executeQuery<{ listProyectosPaginated: PaginatedProyectoResponse }>(
      LIST_PROYECTOS_PAGINATED_QUERY,
      { input }
    );
    return response.listProyectosPaginated;
  }

  /**
   * Obtiene un proyecto por ID
   */
  async getProyecto(id_proyecto: string): Promise<Proyecto | null> {
    const response = await executeQuery<{ getProyecto: Proyecto | null }>(
      GET_PROYECTO_QUERY,
      { id_proyecto }
    );
    return response.getProyecto;
  }

  /**
   * Crea un nuevo proyecto
   */
  async createProyecto(input: ProyectoInput): Promise<Proyecto> {
    const response = await executeMutation<{ addProyecto: Proyecto }>(
      ADD_PROYECTO_MUTATION,
      input
    );
    return response.addProyecto;
  }

  /**
   * Actualiza un proyecto existente
   */
  async updateProyecto(input: ProyectoUpdateInput): Promise<Proyecto> {
    const response = await executeMutation<{ updateProyecto: Proyecto }>(
      UPDATE_PROYECTO_MUTATION,
      input
    );
    return response.updateProyecto;
  }

  /**
   * Elimina un proyecto
   */
  async deleteProyecto(id_proyecto: string): Promise<Proyecto> {
    const response = await executeMutation<{ deleteProyecto: Proyecto }>(
      DELETE_PROYECTO_MUTATION,
      { id_proyecto }
    );
    return response.deleteProyecto;
  }
}

export const proyectoService = new ProyectoService();

