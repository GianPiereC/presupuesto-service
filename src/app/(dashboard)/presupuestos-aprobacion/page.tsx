'use client';

import { useState, useMemo } from 'react';
import { Search, X, Building2, FileText, Layers, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ProyectoGrupoCardAprobacion from './components/ProyectoGrupoCardAprobacion';
import { useAprobacionesPendientesAgrupadas } from '@/hooks/useAprobaciones';

export default function PresupuestosAprobacionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState<string>('');
  const [filtroPresupuesto, setFiltroPresupuesto] = useState<string>('');
  const [filtroTipoAprobacion, setFiltroTipoAprobacion] = useState<'' | 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META'>('');

  // Obtener datos reales del backend
  const { data: proyectosConPresupuestos = [], isLoading, error } = useAprobacionesPendientesAgrupadas();

  // Filtrar proyectos y sus presupuestos por búsqueda
  const proyectosFiltrados = useMemo(() => {
    if (!proyectosConPresupuestos.length) return [];

    let filtrados = proyectosConPresupuestos.map((proyectoConPresupuestos) => {
      let gruposFiltrados = [...proyectoConPresupuestos.gruposPresupuestos];

      // Filtro por búsqueda general
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        gruposFiltrados = gruposFiltrados.filter(
          (grupo) =>
            grupo.presupuestoPadre.nombre_presupuesto.toLowerCase().includes(query) ||
            grupo.presupuestoPadre.id_presupuesto.toLowerCase().includes(query) ||
            grupo.versiones.some(
              (v) =>
                v.nombre_presupuesto.toLowerCase().includes(query) ||
                v.id_presupuesto.toLowerCase().includes(query)
            ) ||
            proyectoConPresupuestos.proyecto.nombre_proyecto.toLowerCase().includes(query)
        );
      }

      // Filtro por ID de presupuesto específico
      if (filtroPresupuesto.trim()) {
        const query = filtroPresupuesto.toLowerCase().trim();
        gruposFiltrados = gruposFiltrados.filter(
          (grupo) =>
            grupo.presupuestoPadre.id_presupuesto.toLowerCase().includes(query) ||
            grupo.versiones.some((v) => v.id_presupuesto.toLowerCase().includes(query))
        );
      }

      // Filtro por tipo de aprobación
      if (filtroTipoAprobacion) {
        gruposFiltrados = gruposFiltrados.filter(
          (grupo) => grupo.tipoAprobacion === filtroTipoAprobacion
        );
      }

      return {
        ...proyectoConPresupuestos,
        gruposPresupuestos: gruposFiltrados,
      };
    });

    // Filtrar proyectos que no tengan grupos después del filtrado
    filtrados = filtrados.filter((p) => p.gruposPresupuestos.length > 0);

    return filtrados;
  }, [proyectosConPresupuestos, searchQuery, filtroPresupuesto, filtroTipoAprobacion]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const totalProyectos = proyectosFiltrados.length;
    const totalGrupos = proyectosFiltrados.reduce((acc, p) => acc + p.gruposPresupuestos.length, 0);
    const totalVersiones = proyectosFiltrados.reduce(
      (acc, p) => acc + p.gruposPresupuestos.reduce((sum, g) => sum + g.versiones.length, 0),
      0
    );
    const pendientesLicitacion = proyectosFiltrados.reduce(
      (acc, p) =>
        acc +
        p.gruposPresupuestos.filter((g) => g.tipoAprobacion === 'LICITACION_A_CONTRACTUAL').length +
        p.gruposPresupuestos.filter((g) => g.tipoAprobacion === 'NUEVA_VERSION_META').length,
      0
    );
    const pendientesContractual = proyectosFiltrados.reduce(
      (acc, p) =>
        acc + p.gruposPresupuestos.filter((g) => g.tipoAprobacion === 'CONTRACTUAL_A_META').length,
      0
    );
    const pendientesOficializarMeta = proyectosFiltrados.reduce(
      (acc, p) =>
        acc + p.gruposPresupuestos.filter((g) => g.tipoAprobacion === 'OFICIALIZAR_META').length,
      0
    );
    return { totalProyectos, totalGrupos, totalVersiones, pendientesLicitacion, pendientesContractual, pendientesOficializarMeta };
  }, [proyectosFiltrados]);

  const clearFilters = () => {
    setSearchQuery('');
    setFiltroProyecto('');
    setFiltroPresupuesto('');
    setFiltroTipoAprobacion('');
  };

  const hasActiveFilters = searchQuery || filtroProyecto || filtroPresupuesto || filtroTipoAprobacion;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Aprobación de Presupuestos
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Gestión de aprobaciones para pasar de Licitación a Contractual, Contractual a Meta, nuevas versiones Meta y oficialización Meta
          </p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-4">
        <div className="space-y-3">
          {/* Búsqueda general */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <Input
              type="text"
              placeholder="Buscar por nombre de presupuesto, proyecto o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Filtro por tipo de aprobación */}
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
                Tipo de Aprobación
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                <select
                  value={filtroTipoAprobacion}
                  onChange={(e) => setFiltroTipoAprobacion(e.target.value as '' | 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META')}
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Todos los tipos</option>
                  <option value="LICITACION_A_CONTRACTUAL">Licitación → Contractual</option>
                  <option value="CONTRACTUAL_A_META">Contractual → Meta</option>
                  <option value="NUEVA_VERSION_META">Nueva Versión Meta</option>
                  <option value="OFICIALIZAR_META">Oficializar Meta</option>
                </select>
              </div>
            </div>

            {/* Filtro por ID de presupuesto */}
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
                Filtrar por ID Presupuesto
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                <Input
                  type="text"
                  placeholder="Ej: PTO0000000172"
                  value={filtroPresupuesto}
                  onChange={(e) => setFiltroPresupuesto(e.target.value)}
                  className="pl-10 text-xs"
                />
              </div>
            </div>

            {/* Botón limpiar filtros */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-medium transition-all duration-200 bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {proyectosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Proyectos */}
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow px-3 py-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-[var(--text-primary)] text-sm">
                  {estadisticas.totalProyectos}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  proyecto{estadisticas.totalProyectos !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Presupuestos pendientes */}
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-[var(--text-primary)] text-sm">
                  {estadisticas.totalGrupos}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  presupuesto{estadisticas.totalGrupos !== 1 ? 's' : ''} pendiente{estadisticas.totalGrupos !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Licitación → Contractual */}
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow px-3 py-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-orange-600 dark:text-orange-400 text-sm">
                  {estadisticas.pendientesLicitacion}
                </span>
                <div className="flex items-center gap-0.5 text-xs text-[var(--text-secondary)]">
                  <span>Licitación</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span>Contractual</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contractual → Meta */}
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                  {estadisticas.pendientesContractual}
                </span>
                <div className="flex items-center gap-0.5 text-xs text-[var(--text-secondary)]">
                  <span>Contractual</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span>Meta</span>
                </div>
              </div>
            </div>
          </div>

          {/* Oficializar Meta */}
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-purple-600 dark:text-purple-400 text-sm">
                  {estadisticas.pendientesOficializarMeta}
                </span>
                <div className="flex items-center gap-0.5 text-xs text-[var(--text-secondary)]">
                  <span>Meta</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span>Vigente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listado de proyectos con sus presupuestos pendientes de aprobación */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
              <p className="text-xs text-[var(--text-secondary)]">Cargando aprobaciones pendientes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-red-600 dark:text-red-400">
              Error al cargar las aprobaciones. Por favor, intente nuevamente.
            </p>
          </div>
        ) : proyectosFiltrados.length > 0 ? (
          proyectosFiltrados.map((proyectoConPresupuestos) => (
            <ProyectoGrupoCardAprobacion
              key={proyectoConPresupuestos.proyecto.id_proyecto}
              proyecto={proyectoConPresupuestos.proyecto}
              gruposPresupuestos={proyectoConPresupuestos.gruposPresupuestos}
            />
          ))
        ) : (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              {hasActiveFilters
                ? 'No se encontraron presupuestos que coincidan con los filtros aplicados.'
                : 'No hay presupuestos pendientes de aprobación.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

