import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import { GET_PRESUPUESTOS_BY_PROYECTO_QUERY, GET_PRESUPUESTO_QUERY, GET_ESTRUCTURA_PRESUPUESTO_QUERY, GET_PRESUPUESTOS_POR_FASE_QUERY } from '@/graphql/queries/presupuesto.queries';
import { ADD_PRESUPUESTO_MUTATION, UPDATE_PRESUPUESTO_MUTATION, DELETE_PRESUPUESTO_MUTATION, CREAR_PRESUPUESTO_PADRE_MUTATION, CREAR_VERSION_DESDE_PADRE_MUTATION, CREAR_VERSION_DESDE_VERSION_MUTATION, ENVIAR_A_LICITACION_MUTATION, PASAR_A_CONTRACTUAL_MUTATION, CREAR_PRESUPUESTO_META_DESDE_CONTRACTUAL_MUTATION, ACTUALIZAR_PRESUPUESTO_PADRE_MUTATION, ELIMINAR_GRUPO_PRESUPUESTO_COMPLETO_MUTATION, ENVIAR_VERSION_META_A_APROBACION_MUTATION } from '@/graphql/mutations/presupuesto.mutations';
import { useAuth } from '@/context/auth-context';
import toast from 'react-hot-toast';

export interface Presupuesto {
  _id?: string;
  id_presupuesto: string;
  id_proyecto: string;
  nombre_presupuesto: string;
  costo_directo: number;
  monto_igv: number;
  monto_utilidad: number;
  parcial_presupuesto: number;
  total_presupuesto: number;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  fecha_creacion: string;
  observaciones: string;
  numeracion_presupuesto?: number;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
  version?: number | null;
  descripcion_version?: string;
  es_padre?: boolean;
  id_grupo_version?: string;
  id_presupuesto_base?: string;
  id_presupuesto_licitacion?: string;
  version_licitacion_aprobada?: number;
  estado?: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'vigente';
  estado_aprobacion?: {
    tipo: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | null;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
    id_aprobacion?: string;
  };
  es_inmutable?: boolean;
  es_activo?: boolean;
}

/**
 * Normaliza presupuestos antiguos (sin campos nuevos) como versión 1
 */
export function normalizarPresupuesto(p: Presupuesto): Presupuesto {
  // Si es presupuesto antiguo (sin id_grupo_version y sin version)
  // Incluye el caso donde es_padre: true pero id_grupo_version: null (datos antiguos)
  if (!p.id_grupo_version && (p.version === null || p.version === undefined)) {
    return {
      ...p,
      // Asignar valores por defecto para compatibilidad
      id_grupo_version: p.id_presupuesto, // Usar su propio ID como grupo
      version: 1,                          // Tratar como versión 1
      es_padre: false,                    // No es padre, es versión (para mostrar)
      fase: (p.fase || 'BORRADOR') as 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META',          // Default a BORRADOR si no tiene fase
    };
  }
  
  // Si es un padre nuevo (tiene id_grupo_version pero version es null)
  // No normalizar, dejarlo como está (no se muestra en la lista de versiones)
  if (p.es_padre === true && p.id_grupo_version && p.version === null) {
    return p; // Dejar el padre como está, no se muestra
  }
  
  // Si ya tiene campos nuevos, usar tal cual
  return p;
}

/**
 * Hook para obtener presupuestos por proyecto
 */
export function usePresupuestosByProyecto(id_proyecto: string | null) {
  return useQuery({
    queryKey: ['presupuestos', 'proyecto', id_proyecto],
    queryFn: async () => {
      if (!id_proyecto) return [];
      const response = await executeQuery<{ getPresupuestosByProyecto: Presupuesto[] }>(
        GET_PRESUPUESTOS_BY_PROYECTO_QUERY,
        { id_proyecto }
      );
      // Normalizar presupuestos antiguos
      // NOTA: Incluimos padres para poder detectar versiones ganadoras/cerradas en la vista de proyectos
      const presupuestosNormalizados = response.getPresupuestosByProyecto.map(normalizarPresupuesto);
      return presupuestosNormalizados;
    },
    enabled: !!id_proyecto,
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener presupuestos por fase
 * Retorna tanto padres como versiones para poder agrupar
 */
export function usePresupuestosPorFase(
  fase: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META',
  id_proyecto?: string | null
) {
  return useQuery({
    queryKey: ['presupuestos', 'fase', fase, id_proyecto],
    queryFn: async () => {
      const response = await executeQuery<{ getPresupuestosPorFaseYEstado: Presupuesto[] }>(
        GET_PRESUPUESTOS_POR_FASE_QUERY,
        {
          fase,
          estado: null,
          id_proyecto: id_proyecto || null,
        }
      );
      // Normalizar todos los presupuestos (padres y versiones)
      const presupuestosNormalizados = response.getPresupuestosPorFaseYEstado.map(normalizarPresupuesto);
      return presupuestosNormalizados;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener un presupuesto por ID
 */
export function usePresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return null;
      const response = await executeQuery<{ getPresupuesto: Presupuesto | null }>(
        GET_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      return response.getPresupuesto;
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

// Tipos para la estructura del presupuesto
export interface TituloEstructura {
  _id?: string;
  id_titulo: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: 'TITULO' | 'SUBTITULO';
  orden: number;
  total_parcial: number;
}

export interface PartidaEstructura {
  _id?: string;
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre: string | null;
  nivel_partida: number;
  numero_item: string;
  codigo_partida: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
  orden: number;
  estado: 'Activa' | 'Inactiva';
}

export interface EstructuraPresupuesto {
  presupuesto: Presupuesto;
  titulos: TituloEstructura[];
  partidas: PartidaEstructura[];
}

/**
 * Hook para obtener la estructura completa del presupuesto (títulos y partidas)
 */
export function useEstructuraPresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['estructura-presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return null;
      const response = await executeQuery<{ getEstructuraPresupuesto: EstructuraPresupuesto | null }>(
        GET_ESTRUCTURA_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      return response.getEstructuraPresupuesto;
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

export interface PresupuestoInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  costo_directo: number;
  monto_igv: number;
  monto_utilidad: number;
  parcial_presupuesto: number;
  observaciones: string;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  total_presupuesto: number;
  numeracion_presupuesto?: number;
}

export interface PresupuestoUpdateInput {
  id_presupuesto: string;
  nombre_presupuesto?: string;
  numeracion_presupuesto?: number;
  costo_directo?: number;
  monto_igv?: number;
  monto_utilidad?: number;
  observaciones?: string;
  porcentaje_igv?: number;
  porcentaje_utilidad?: number;
  plazo?: number;
  ppto_base?: number;
  ppto_oferta?: number;
  total_presupuesto?: number;
}

export interface CrearPresupuestoPadreInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  porcentaje_igv?: number;
  porcentaje_utilidad?: number;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
}

/**
 * Hook para crear un presupuesto padre (sin detalles)
 */
export function useCreatePresupuestoPadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrearPresupuestoPadreInput) => {
      const response = await executeMutation<{ crearPresupuestoPadre: Presupuesto }>(
        CREAR_PRESUPUESTO_PADRE_MUTATION,
        input
      );
      return response.crearPresupuestoPadre;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', variables.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el presupuesto');
    },
  });
}

/**
 * Hook para actualizar presupuesto padre y propagar cambios a hijos
 */
export function useUpdatePresupuestoPadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id_presupuesto: string;
      nombre_presupuesto?: string;
      porcentaje_igv?: number;
      porcentaje_utilidad?: number;
    }) => {
      const response = await executeMutation<{ actualizarPresupuestoPadre: Presupuesto }>(
        ACTUALIZAR_PRESUPUESTO_PADRE_MUTATION,
        input
      );
      return response.actualizarPresupuestoPadre;
    },
    onSuccess: (presupuesto) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el presupuesto');
    },
  });
}

/**
 * Hook para crear versión 1 desde un presupuesto padre
 */
export function useCreateVersionDesdePadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_padre: string; descripcion_version?: string }) => {
      const response = await executeMutation<{ crearVersionDesdePadre: Presupuesto }>(
        CREAR_VERSION_DESDE_PADRE_MUTATION,
        input
      );
      return response.crearVersionDesdePadre;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Versión 1 creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la versión');
    },
  });
}

/**
 * Hook para crear una nueva versión clonando un presupuesto completo (con estructura)
 */
export function useCreateVersionDesdeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_base: string; descripcion_version?: string }) => {
      const response = await executeMutation<{ crearVersionDesdeVersion: Presupuesto }>(
        CREAR_VERSION_DESDE_VERSION_MUTATION,
        {
          id_presupuesto_base: input.id_presupuesto_base,
          descripcion_version: input.descripcion_version,
        }
      );
      return response.crearVersionDesdeVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase'] });
      // Invalidar también la query específica de la fase del presupuesto creado
      if (data.fase) {
        queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', data.fase] });
      }
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['estructura', data.id_presupuesto] });
      toast.success('Nueva versión creada exitosamente con toda la estructura');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la nueva versión');
    },
  });
}

/**
 * Hook para enviar versión 1 a licitación
 */
export function useEnviarALicitacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_presupuesto: string) => {
      const response = await executeMutation<{ enviarALicitacion: Presupuesto }>(
        ENVIAR_A_LICITACION_MUTATION,
        { id_presupuesto }
      );
      return response.enviarALicitacion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto enviado a licitación exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al enviar a licitación');
    },
  });
}

/**
 * Hook para pasar una versión de LICITACION a CONTRACTUAL
 * Ahora crea una aprobación en lugar de crear directamente el presupuesto contractual
 */
export function usePasarAContractual() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_licitacion: string; motivo?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await executeMutation<{
        pasarAContractual: {
          id_aprobacion: string;
          id_presupuesto: string;
          id_grupo_version?: string;
          id_proyecto: string;
          tipo_aprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META';
          usuario_solicitante_id: string;
          estado: string;
          fecha_solicitud: string;
          comentario_solicitud?: string;
          version_presupuesto?: number;
          monto_presupuesto?: number;
        };
      }>(PASAR_A_CONTRACTUAL_MUTATION, {
        id_presupuesto_licitacion: input.id_presupuesto_licitacion,
        usuario_solicitante_id: user.id,
        motivo: input.motivo,
      });
      return response.pasarAContractual;
    },
    onSuccess: (data) => {
      // Invalidar queries de ambas fases y aprobaciones
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'LICITACION'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      toast.success('Solicitud de aprobación creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la solicitud de aprobación');
    },
  });
}

/**
 * Hook para crear presupuesto META desde una versión contractual
 */
export function useCrearPresupuestoMetaDesdeContractual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_contractual: string; motivo?: string }) => {
      const response = await executeMutation<{ 
        crearPresupuestoMetaDesdeContractual: Presupuesto 
      }>(
        CREAR_PRESUPUESTO_META_DESDE_CONTRACTUAL_MUTATION,
        input
      );
      return response.crearPresupuestoMetaDesdeContractual;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto Meta creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear presupuesto Meta');
    },
  });
}

/**
 * Hook para enviar versión META en estado borrador a aprobación
 */
export function useEnviarVersionMetaAAprobacion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_meta: string; comentario?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      const response = await executeMutation<{ 
        enviarVersionMetaAAprobacion: {
          id_aprobacion: string;
          id_presupuesto: string;
          id_grupo_version: string;
          id_proyecto: string;
          tipo_aprobacion: string;
          usuario_solicitante_id: string;
          estado: string;
          fecha_solicitud: string;
          comentario_solicitud?: string;
          version_presupuesto?: number;
          monto_presupuesto?: number;
        }
      }>(ENVIAR_VERSION_META_A_APROBACION_MUTATION, {
        id_presupuesto_meta: input.id_presupuesto_meta,
        usuario_solicitante_id: user.id,
        comentario: input.comentario,
      });
      return response.enviarVersionMetaAAprobacion;
    },
    onSuccess: (data) => {
      // Invalidar queries de presupuestos META y aprobaciones
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      toast.success('Versión enviada a aprobación exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al enviar versión a aprobación');
    },
  });
}

/**
 * Hook para crear un presupuesto (legacy - mantener para compatibilidad)
 */
export function useCreatePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PresupuestoInput) => {
      const response = await executeMutation<{ addPresupuesto: Presupuesto }>(
        ADD_PRESUPUESTO_MUTATION,
        input
      );
      return response.addPresupuesto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', variables.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el presupuesto');
    },
  });
}

/**
 * Hook para actualizar un presupuesto
 */
export function useUpdatePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PresupuestoUpdateInput) => {
      const response = await executeMutation<{ updatePresupuesto: Presupuesto }>(
        UPDATE_PRESUPUESTO_MUTATION,
        input
      );
      return response.updatePresupuesto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto'] });
      toast.success('Presupuesto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el presupuesto');
    },
  });
}

/**
 * Hook para eliminar un presupuesto
 */
export function useDeletePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_presupuesto: string) => {
      const response = await executeMutation<{ deletePresupuesto: Presupuesto }>(
        DELETE_PRESUPUESTO_MUTATION,
        { id_presupuesto }
      );
      return response.deletePresupuesto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el presupuesto');
    },
  });
}

export interface EliminacionGrupoResponse {
  success: boolean;
  message: string;
  grupo_version_eliminado: string;
}

/**
 * Hook para eliminar todo el grupo de versiones de presupuesto (solo en estado BORRADOR)
 */
export function useEliminarGrupoPresupuestoCompleto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_grupo_version: string) => {
      const response = await executeMutation<{ eliminarGrupoPresupuestoCompleto: EliminacionGrupoResponse }>(
        ELIMINAR_GRUPO_PRESUPUESTO_COMPLETO_MUTATION,
        { id_grupo_version }
      );
      return response.eliminarGrupoPresupuestoCompleto;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
        queryClient.invalidateQueries({ queryKey: ['proyectos'] });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el grupo de presupuesto');
    },
  });
}

