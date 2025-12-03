import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/services/graphql-client';
import {
  LIST_DEPARTAMENTOS_QUERY,
  GET_PROVINCIAS_BY_DEPARTAMENTO_QUERY,
  GET_DISTRITOS_BY_PROVINCIA_QUERY,
  GET_LOCALIDADES_BY_DISTRITO_QUERY,
  LIST_INFRAESTRUCTURAS_QUERY,
} from '@/graphql/queries/catalogos.queries';

export interface Departamento {
  _id?: string;
  id_departamento: string;
  nombre_departamento: string;
  ubigeo?: string;
  esNuevoFormato?: boolean;
}

export interface Provincia {
  _id?: string;
  id_provincia: string;
  id_departamento: string;
  nombre_provincia: string;
  ubigeo?: string;
  esNuevoFormato?: boolean;
}

export interface Distrito {
  _id?: string;
  id_distrito: string;
  id_provincia: string;
  nombre_distrito: string;
  id_departamento?: string;
  ubigeo?: string;
  esNuevoFormato?: boolean;
}

export interface Localidad {
  _id?: string;
  id_localidad: string;
  id_distrito: string;
  nombre_localidad: string;
}

export interface Infraestructura {
  _id?: string;
  id_infraestructura: string;
  nombre_infraestructura: string;
  tipo_infraestructura: string;
  descripcion: string;
}

/**
 * Hook para obtener la lista de departamentos
 */
export function useDepartamentos() {
  return useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => {
      const response = await executeQuery<{ listDepartamentos: Departamento[] }>(
        LIST_DEPARTAMENTOS_QUERY,
        {}
      );
      return response.listDepartamentos;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener provincias por departamento
 */
export function useProvinciasByDepartamento(id_departamento: string | null) {
  return useQuery({
    queryKey: ['provincias', id_departamento],
    queryFn: async () => {
      if (!id_departamento) return [];
      const response = await executeQuery<{ getProvinciasByDepartamento: Provincia[] }>(
        GET_PROVINCIAS_BY_DEPARTAMENTO_QUERY,
        { id_departamento }
      );
      return response.getProvinciasByDepartamento;
    },
    enabled: !!id_departamento,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener distritos por provincia
 */
export function useDistritosByProvincia(id_provincia: string | null) {
  return useQuery({
    queryKey: ['distritos', id_provincia],
    queryFn: async () => {
      if (!id_provincia) return [];
      const response = await executeQuery<{ getDistritosByProvincia: Distrito[] }>(
        GET_DISTRITOS_BY_PROVINCIA_QUERY,
        { id_provincia }
      );
      return response.getDistritosByProvincia;
    },
    enabled: !!id_provincia,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener localidades por distrito
 */
export function useLocalidadesByDistrito(id_distrito: string | null) {
  return useQuery({
    queryKey: ['localidades', id_distrito],
    queryFn: async () => {
      if (!id_distrito) return [];
      const response = await executeQuery<{ getLocalidadesByDistrito: Localidad[] }>(
        GET_LOCALIDADES_BY_DISTRITO_QUERY,
        { id_distrito }
      );
      return response.getLocalidadesByDistrito;
    },
    enabled: !!id_distrito,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener la lista de infraestructuras
 */
export function useInfraestructuras() {
  return useQuery({
    queryKey: ['infraestructuras'],
    queryFn: async () => {
      const response = await executeQuery<{ listInfraestructuras: Infraestructura[] }>(
        LIST_INFRAESTRUCTURAS_QUERY,
        {}
      );
      return response.listInfraestructuras;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

