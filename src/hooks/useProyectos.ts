import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proyectoService, PaginationFilterInput, ProyectoInput, ProyectoUpdateInput } from '@/services/proyecto-service';
import toast from 'react-hot-toast';

/**
 * Hook para listar proyectos con paginación
 */
export function useProyectos(input?: PaginationFilterInput) {
  return useQuery({
    queryKey: ['proyectos', input],
    queryFn: () => proyectoService.listProyectosPaginated(input),
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener un proyecto por ID
 */
export function useProyecto(id_proyecto: string | null) {
  return useQuery({
    queryKey: ['proyecto', id_proyecto],
    queryFn: () => (id_proyecto ? proyectoService.getProyecto(id_proyecto) : null),
    enabled: !!id_proyecto,
    staleTime: 30000,
  });
}

/**
 * Hook para crear un proyecto
 */
export function useCreateProyecto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProyectoInput) => proyectoService.createProyecto(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el proyecto');
    },
  });
}

/**
 * Hook para actualizar un proyecto
 */
export function useUpdateProyecto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProyectoUpdateInput) => proyectoService.updateProyecto(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto'] });
      toast.success('Proyecto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el proyecto');
    },
  });
}

/**
 * Hook para eliminar un proyecto
 */
export function useDeleteProyecto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id_proyecto: string) => proyectoService.deleteProyecto(id_proyecto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el proyecto');
    },
  });
}

