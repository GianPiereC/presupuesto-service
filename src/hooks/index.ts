/**
 * Exportaciones centralizadas de hooks
 */

export { useAuth } from '@/context/auth-context';
export {
  useTitulosByPresupuesto,
  useTitulo,
  useCreateTitulo,
  useUpdateTitulo,
  useDeleteTitulo,
  type Titulo,
  type TipoTitulo,
} from './useTitulos';
export {
  useProyectos,
  useProyecto,
  useCreateProyecto,
  useUpdateProyecto,
  useDeleteProyecto,
} from './useProyectos';
export {
  useDepartamentos,
  useProvinciasByDepartamento,
  useDistritosByProvincia,
  useLocalidadesByDistrito,
  type Departamento,
  type Provincia,
  type Distrito,
  type Localidad,
} from './useCatalogos';
export {
  usePresupuestosByProyecto,
  usePresupuesto,
  usePresupuestosPorFase,
  useCreateVersionDesdeVersion,
  usePasarAContractual,
  useCrearPresupuestoMetaDesdeContractual,
  useEnviarVersionMetaAAprobacion,
  useEnviarVersionMetaAOficializacion,
  useUpdatePresupuestoPadre,
  useEliminarGrupoPresupuestoCompleto,
  type Presupuesto,
  type EliminacionGrupoResponse,
} from './usePresupuestos';
export {
  useAprobacionesPendientesAgrupadas,
  useAprobacionesPendientes,
  useAprobacionesPorPresupuesto,
  useAprobacion,
  useAprobarPresupuesto,
  useRechazarPresupuesto,
  type AprobacionPresupuesto,
  type ProyectoConAprobaciones,
} from './useAprobaciones';
export {
  useApuByPartida,
  useApu,
  useApusByPresupuesto,
  useCreateApu,
  useUpdateApu,
  useAddRecursoToApu,
  useUpdateRecursoInApu,
  useRemoveRecursoFromApu,
  type Apu,
  type RecursoApu,
  type RecursoApuInput,
  type TipoRecursoApu,
} from './useAPU';
export {
  useEspecialidades,
  useEspecialidad,
  type Especialidad,
} from './useEspecialidades';

