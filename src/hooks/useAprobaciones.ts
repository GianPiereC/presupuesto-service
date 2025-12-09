import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import {
  GET_APROBACIONES_PENDIENTES_AGRUPADAS_QUERY,
  GET_APROBACIONES_PENDIENTES_QUERY,
  GET_APROBACIONES_POR_PRESUPUESTO_QUERY,
  GET_APROBACION_QUERY,
} from '@/graphql/queries/aprobacion.queries';
import {
  APROBAR_PRESUPUESTO_MUTATION,
  RECHAZAR_PRESUPUESTO_MUTATION,
} from '@/graphql/mutations/aprobacion.mutations';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/auth-context';

export interface AprobacionPresupuesto {
  id_aprobacion: string;
  id_presupuesto: string;
  id_grupo_version?: string;
  id_proyecto: string;
  tipo_aprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META';
  usuario_solicitante_id: string;
  usuario_aprobador_id?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
  fecha_solicitud: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  comentario_solicitud?: string;
  comentario_aprobacion?: string;
  comentario_rechazo?: string;
  version_presupuesto?: number;
  monto_presupuesto?: number;
}

export interface ProyectoConAprobaciones {
  proyecto: {
    id_proyecto: string;
    nombre_proyecto: string;
    cliente: string;
    empresa: string;
    estado: string;
    total_proyecto: number;
    plazo: number;
    fecha_creacion: string;
  };
  gruposPresupuestos: Array<{
    id_aprobacion: string;
    id_grupo_version: string;
    presupuestoPadre: {
      id_presupuesto: string;
      nombre_presupuesto: string;
      fecha_creacion: string;
      total_presupuesto: number;
    };
    versiones: Array<{
      id_presupuesto: string;
      nombre_presupuesto: string;
      version: number;
      fecha_creacion: string;
      total_presupuesto: number;
      descripcion_version?: string;
    }>;
    tipoAprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META';
  }>;
}

/**
 * Hook para obtener aprobaciones pendientes agrupadas por proyecto
 */
export function useAprobacionesPendientesAgrupadas() {
  return useQuery({
    queryKey: ['aprobaciones', 'pendientes', 'agrupadas'],
    queryFn: async () => {
      const response = await executeQuery<{
        getAprobacionesPendientesAgrupadas: ProyectoConAprobaciones[];
      }>(GET_APROBACIONES_PENDIENTES_AGRUPADAS_QUERY);
      return response.getAprobacionesPendientesAgrupadas;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener todas las aprobaciones pendientes
 */
export function useAprobacionesPendientes() {
  return useQuery({
    queryKey: ['aprobaciones', 'pendientes'],
    queryFn: async () => {
      const response = await executeQuery<{
        getAprobacionesPendientes: AprobacionPresupuesto[];
      }>(GET_APROBACIONES_PENDIENTES_QUERY);
      return response.getAprobacionesPendientes;
    },
    staleTime: 30000,
  });
}

/**
 * Hook para obtener aprobaciones por presupuesto
 */
export function useAprobacionesPorPresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['aprobaciones', 'presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return [];
      const response = await executeQuery<{
        getAprobacionesPorPresupuesto: AprobacionPresupuesto[];
      }>(GET_APROBACIONES_POR_PRESUPUESTO_QUERY, { id_presupuesto });
      return response.getAprobacionesPorPresupuesto;
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

/**
 * Hook para obtener una aprobación por ID
 */
export function useAprobacion(id_aprobacion: string | null) {
  return useQuery({
    queryKey: ['aprobacion', id_aprobacion],
    queryFn: async () => {
      if (!id_aprobacion) return null;
      const response = await executeQuery<{
        getAprobacion: AprobacionPresupuesto | null;
      }>(GET_APROBACION_QUERY, { id_aprobacion });
      return response.getAprobacion;
    },
    enabled: !!id_aprobacion,
    staleTime: 30000,
  });
}

/**
 * Hook para aprobar un presupuesto
 */
export function useAprobarPresupuesto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_aprobacion: string; comentario?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await executeMutation<{
        aprobarPresupuesto: AprobacionPresupuesto;
      }>(APROBAR_PRESUPUESTO_MUTATION, {
        id_aprobacion: input.id_aprobacion,
        usuario_aprobador_id: user.id,
        comentario: input.comentario,
      });
      return response.aprobarPresupuesto;
    },
    onSuccess: (data) => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'LICITACION'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto aprobado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al aprobar el presupuesto');
    },
  });
}

/**
 * Hook para rechazar un presupuesto
 */
export function useRechazarPresupuesto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_aprobacion: string; comentario: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await executeMutation<{
        rechazarPresupuesto: AprobacionPresupuesto;
      }>(RECHAZAR_PRESUPUESTO_MUTATION, {
        id_aprobacion: input.id_aprobacion,
        usuario_aprobador_id: user.id,
        comentario: input.comentario,
      });
      return response.rechazarPresupuesto;
    },
    onSuccess: (data) => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'LICITACION'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto rechazado exitosamente');
    },
    onError: (error: any) => {
      const mensajeError = error?.message || 'Error al rechazar el presupuesto';
      toast.error(mensajeError);
    },
  });
}

