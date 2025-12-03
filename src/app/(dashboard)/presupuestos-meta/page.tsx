'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building2, FileText, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePresupuestosPorFase } from '@/hooks/usePresupuestos';
import { useProyectos } from '@/hooks';
import PresupuestoGrupoCardMeta from './components/PresupuestoGrupoCardMeta';
import ProyectoGrupoCardMeta from './components/ProyectoGrupoCardMeta';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import type { Proyecto } from '@/services/proyecto-service';

interface GrupoPresupuesto {
  id_grupo_version: string;
  presupuestoPadre: Presupuesto;
  versiones: Presupuesto[];
}

interface ProyectoConPresupuestos {
  proyecto: Proyecto;
  gruposPresupuestos: GrupoPresupuesto[];
}

export default function PresupuestosMetaPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState<string>('');
  const [filtroPresupuesto, setFiltroPresupuesto] = useState<string>('');

  // Obtener todos los proyectos para el filtro
  const { data: proyectosData } = useProyectos({
    pagination: {
      page: 1,
      limit: 1000,
      sortBy: 'nombre_proyecto',
      sortOrder: 'asc',
    },
  });
  const proyectos = proyectosData?.data || [];

  // Obtener presupuestos en fase META (incluye padres y versiones)
  const id_proyecto_filtrado = filtroProyecto || null;
  const { data: presupuestos, isLoading, error } = usePresupuestosPorFase('META', id_proyecto_filtrado);

  // Agrupar presupuestos primero por proyecto, luego por id_grupo_version
  // IMPORTANTE: Mostrar el padre aunque esté en otra fase (ej: CONTRACTUAL o META)
  const proyectosConPresupuestos = useMemo(() => {
    if (!presupuestos) return [];

    // Separar padres y versiones
    const padres = presupuestos.filter((p) => p.es_padre && p.version === null);
    const versiones = presupuestos.filter((p) => !p.es_padre || p.version !== null);

    // Crear mapa de grupos por id_grupo_version
    // Incluir padres que tengan versiones META (aunque el padre esté en otra fase)
    const gruposMap = new Map<string, GrupoPresupuesto>();

    // Primero, buscar padres que tengan versiones META
    versiones.forEach((version) => {
      if (version.id_grupo_version && version.fase === 'META') {
        const grupo = gruposMap.get(version.id_grupo_version);
        if (!grupo) {
          // Buscar el padre (puede estar en cualquier fase)
          const padre = padres.find(p => p.id_grupo_version === version.id_grupo_version);
          if (padre) {
            gruposMap.set(version.id_grupo_version, {
              id_grupo_version: version.id_grupo_version,
              presupuestoPadre: padre,
              versiones: [],
            });
          }
        }
      }
    });

    // Luego, agregar las versiones META
    versiones.forEach((version) => {
      if (version.id_grupo_version && version.fase === 'META') {
        const grupo = gruposMap.get(version.id_grupo_version);
        if (grupo) {
          grupo.versiones.push(version);
        }
      }
    });

    const grupos = Array.from(gruposMap.values());

    // Ahora agrupar por proyecto
    const proyectosMap = new Map<string, ProyectoConPresupuestos>();

    grupos.forEach((grupo) => {
      const idProyecto = grupo.presupuestoPadre.id_proyecto;
      const proyecto = proyectosMap.get(idProyecto);

      if (proyecto) {
        proyecto.gruposPresupuestos.push(grupo);
      } else {
        const proyectoData = proyectos.find((p) => p.id_proyecto === idProyecto);
        if (proyectoData) {
          proyectosMap.set(idProyecto, {
            proyecto: proyectoData,
            gruposPresupuestos: [grupo],
          });
        }
      }
    });

    return Array.from(proyectosMap.values());
  }, [presupuestos, proyectos]);

  // Filtrar proyectos y sus presupuestos por búsqueda
  const proyectosFiltrados = useMemo(() => {
    if (!proyectosConPresupuestos.length) return [];

    let filtrados = proyectosConPresupuestos.map((proyectoConPresupuestos) => {
      let gruposFiltrados = [...proyectoConPresupuestos.gruposPresupuestos];

      // Filtro por búsqueda general (nombre de presupuesto o ID)
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

      return {
        ...proyectoConPresupuestos,
        gruposPresupuestos: gruposFiltrados,
      };
    });

    // Filtrar proyectos que no tengan grupos después del filtrado
    filtrados = filtrados.filter((p) => p.gruposPresupuestos.length > 0);

    return filtrados;
  }, [proyectosConPresupuestos, searchQuery, filtroPresupuesto]);

  const clearFilters = () => {
    setSearchQuery('');
    setFiltroProyecto('');
    setFiltroPresupuesto('');
  };

  const hasActiveFilters = searchQuery || filtroProyecto || filtroPresupuesto;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Presupuestos Meta
        </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Gestión de presupuestos agrupados por proyecto en fase meta
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
            {/* Filtro por proyecto */}
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
                Filtrar por Proyecto
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                <select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>
                      {proyecto.nombre_proyecto}
                    </option>
                  ))}
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
                  className="flex items-center gap-1.5 h-10 px-3 py-1.5 rounded-lg text-xs bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listado de proyectos con sus presupuestos */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
              <p className="text-xs text-[var(--text-secondary)]">Cargando presupuestos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-12 text-center">
            <p className="text-xs text-red-500">Error al cargar los presupuestos</p>
          </div>
        ) : proyectosFiltrados.length > 0 ? (
          proyectosFiltrados.map((proyectoConPresupuestos) => (
            <ProyectoGrupoCardMeta
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
                : 'No hay presupuestos en fase meta.'}
        </p>
          </div>
        )}
      </div>
    </div>
  );
}
