'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '@/components/ui/modal';
import ProyectoCard from './components/ProyectoCard';
import Pagination from './components/Pagination';
import ProyectoForm from './components/ProyectoForm';
import { useProyectos, useCreateProyecto, useUpdateProyecto, useDeleteProyecto } from '@/hooks';
import { PaginationFilterInput } from '@/services/proyecto-service';
import type { Proyecto } from '@/services/proyecto-service';

const ITEMS_PER_PAGE = 20;

export default function ProyectosPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Preparar input para la query
  const queryInput: PaginationFilterInput = useMemo(() => {
    const input: PaginationFilterInput = {
      pagination: {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: 'fecha_creacion',
        sortOrder: 'desc',
      },
    };

    // Agregar búsqueda si existe
    if (searchQuery.trim()) {
      input.search = {
        query: searchQuery.trim(),
        fields: ['nombre_proyecto', 'cliente', 'empresa', 'id_proyecto'],
      };
    }

    // Agregar filtro de estado si existe
    if (estadoFilter) {
      input.filters = [
        {
          field: 'estado',
          value: estadoFilter,
          operator: 'eq',
        },
      ];
    }

    return input;
  }, [currentPage, searchQuery, estadoFilter]);

  // Obtener proyectos
  const { data, isLoading, error } = useProyectos(queryInput);
  const createProyecto = useCreateProyecto();
  const updateProyecto = useUpdateProyecto();
  const deleteProyecto = useDeleteProyecto();

  const proyectos = data?.data || [];
  const pagination = data?.pagination;

  const handleOpenModal = () => {
    setSelectedProyecto(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProyecto(null);
  };

  const handleProyectoClick = (proyecto: Proyecto) => {
    // Navegar a la página de detalles del proyecto
    router.push(`/proyectos/${proyecto.id_proyecto}`);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProyecto(null);
  };

  const handleEditClick = () => {
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (selectedProyecto) {
        // Actualizar proyecto
        await updateProyecto.mutateAsync({
          id_proyecto: selectedProyecto.id_proyecto,
          ...formData,
        });
      } else {
        // Crear proyecto - necesitarías obtener estos valores del formulario o contexto
        await createProyecto.mutateAsync({
          id_usuario: '1', // TODO: obtener del contexto de autenticación
          id_infraestructura: '1', // TODO: obtener del formulario
          nombre_proyecto: formData.nombre_proyecto,
          id_departamento: '1', // TODO: obtener del formulario
          id_provincia: '1', // TODO: obtener del formulario
          id_distrito: '1', // TODO: obtener del formulario
          estado: formData.estado,
          cliente: formData.cliente,
          empresa: formData.empresa,
          plazo: 0, // TODO: obtener del formulario
          ppto_base: 0, // TODO: obtener del formulario
          ppto_oferta: 0, // TODO: obtener del formulario
          jornada: 0, // TODO: obtener del formulario
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedProyecto) return;
    if (confirm('¿Está seguro de que desea eliminar este proyecto?')) {
      try {
        await deleteProyecto.mutateAsync(selectedProyecto.id_proyecto);
        setIsDetailModalOpen(false);
        setSelectedProyecto(null);
      } catch (error) {
        console.error('Error al eliminar proyecto:', error);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Resetear a la primera página al buscar
  };

  const handleEstadoFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEstadoFilter(e.target.value);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Proyectos
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gestión de todos los proyectos
          </p>
        </div>
        <Button onClick={handleOpenModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <Input
              type="text"
              placeholder="Buscar por nombre, cliente, empresa o ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center gap-2">
            <select
              value={estadoFilter}
              onChange={handleEstadoFilterChange}
              className="flex h-10 w-full md:w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>

            {(searchQuery || estadoFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Proyectos */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-[var(--text-secondary)]">Cargando proyectos...</p>
          </div>
        ) : error ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-red-500">Error al cargar proyectos. Por favor, intente nuevamente.</p>
          </div>
        ) : proyectos.length > 0 ? (
          <>
            {proyectos.map((proyecto) => (
              <ProyectoCard
                key={proyecto.id_proyecto}
                proyecto={proyecto}
                onClick={() => handleProyectoClick(proyecto)}
              />
            ))}

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              {searchQuery || estadoFilter
                ? 'No se encontraron proyectos con los filtros aplicados'
                : 'No hay proyectos disponibles'}
            </p>
          </div>
        )}
      </div>

      {/* Modal para Crear/Editar Proyecto */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={createProyecto.isPending || updateProyecto.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="proyecto-form"
              variant="default"
              disabled={createProyecto.isPending || updateProyecto.isPending}
            >
              {createProyecto.isPending || updateProyecto.isPending
                ? selectedProyecto
                  ? 'Actualizando...'
                  : 'Creando...'
                : selectedProyecto
                ? 'Actualizar'
                : 'Crear'}
            </Button>
          </div>
        }
      >
        <ProyectoForm
          proyecto={selectedProyecto || undefined}
          editMode={!!selectedProyecto}
          onSubmit={(proyecto) => {
            handleCloseModal();
          }}
          onCancel={handleCloseModal}
          isLoading={createProyecto.isPending || updateProyecto.isPending}
        />
      </Modal>

      {/* Modal para Ver Detalles del Proyecto */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title={`Detalles: ${selectedProyecto?.nombre_proyecto}`}
        size="lg"
      >
        {selectedProyecto && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">ID Proyecto</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">{selectedProyecto.id_proyecto}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">{selectedProyecto.estado}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Cliente</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">{selectedProyecto.cliente}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Empresa</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">{selectedProyecto.empresa}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Total Proyecto</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">
                  S/ {selectedProyecto.total_proyecto?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Fecha Creación</label>
                <p className="text-xs text-[var(--text-primary)] mt-1">
                  {new Date(selectedProyecto.fecha_creacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]/15">
              <Button variant="outline" onClick={handleCloseDetailModal}>
                Cerrar
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteProyecto.isPending}
                className="text-red-600 hover:text-red-700"
              >
                {deleteProyecto.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
              <Button variant="default" onClick={handleEditClick}>
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

