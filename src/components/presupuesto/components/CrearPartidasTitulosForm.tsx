'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInput, type SearchItem } from '@/components/ui/search-input';
import { useEspecialidades } from '@/hooks/useEspecialidades';
import { X } from 'lucide-react';

interface CrearPartidasTitulosFormProps {
  nombre: string;
  onNombreChange: (nombre: string) => void;
  onSave: (nombre: string, partidaData?: PartidaData, id_especialidad?: string | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  tipo?: 'TITULO' | 'PARTIDA';
  partidaData?: PartidaData;
  id_especialidad?: string | null; // Para edición
}

interface PartidaData {
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
}

export default function CrearPartidasTitulosForm({
  nombre,
  onNombreChange,
  onSave,
  onCancel,
  isLoading = false,
  isEdit = false,
  tipo = 'TITULO',
  partidaData,
  id_especialidad: id_especialidadProp,
}: CrearPartidasTitulosFormProps) {
  const [localNombre, setLocalNombre] = useState(nombre);
  const [localIdEspecialidad, setLocalIdEspecialidad] = useState<string | null>(id_especialidadProp || null);
  const { data: especialidades, isLoading: isLoadingEspecialidades } = useEspecialidades();
  const especialidadesCompletasRef = useRef<Map<string, { id_especialidad: string; nombre: string; descripcion: string }>>(new Map());

  // Actualizar el ref cuando cambian las especialidades
  useEffect(() => {
    if (especialidades) {
      especialidadesCompletasRef.current.clear();
      especialidades.forEach(esp => {
        especialidadesCompletasRef.current.set(esp.id_especialidad, esp);
      });
    }
  }, [especialidades]);

  // Función para buscar especialidades (compatible con SearchInput)
  const buscarEspecialidades = useCallback(async (query: string): Promise<SearchItem[]> => {
    if (!especialidades) return [];
    
    const queryLower = query.toLowerCase().trim();
    
    // Si la query está vacía o tiene menos de 3 caracteres, retornar todas las especialidades
    if (!queryLower || queryLower.length < 3) {
      return especialidades.map(esp => ({
        id: esp.id_especialidad,
        nombre: esp.nombre,
        codigo: esp.descripcion,
      }));
    }
    
    // Filtrar especialidades que coincidan con la búsqueda
    const filtradas = especialidades.filter(esp => 
      esp.nombre.toLowerCase().includes(queryLower) ||
      esp.descripcion.toLowerCase().includes(queryLower) ||
      esp.id_especialidad.toLowerCase().includes(queryLower)
    );
    
    return filtradas.map(esp => ({
      id: esp.id_especialidad,
      nombre: esp.nombre,
      codigo: esp.descripcion,
    }));
  }, [especialidades]);

  const [localPartidaData, setLocalPartidaData] = useState<PartidaData>({
    unidad_medida: partidaData?.unidad_medida || 'und',
    metrado: partidaData?.metrado || 0,
    precio_unitario: partidaData?.precio_unitario || 0,
    parcial_partida: partidaData?.parcial_partida || 0,
  });

  useEffect(() => {
    setLocalNombre(nombre);
  }, [nombre]);

  useEffect(() => {
    if (id_especialidadProp !== undefined) {
      setLocalIdEspecialidad(id_especialidadProp);
    }
  }, [id_especialidadProp]);

  useEffect(() => {
    if (partidaData) {
      setLocalPartidaData({
        unidad_medida: partidaData.unidad_medida || 'und',
        metrado: partidaData.metrado || 0,
        precio_unitario: partidaData.precio_unitario || 0,
        parcial_partida: partidaData.parcial_partida || 0,
      });
    }
  }, [partidaData]);

  const handlePartidaFieldChange = (campo: keyof PartidaData, valor: string | number) => {
    setLocalPartidaData(prev => {
      const nuevo = { ...prev };
      if (campo === 'unidad_medida') {
        nuevo[campo] = valor as string;
      } else {
        const numValor = typeof valor === 'string' ? parseFloat(valor) || 0 : valor;
        nuevo[campo] = numValor;

        // Recalcular parcial_partida cuando cambia metrado o precio_unitario
        if (campo === 'metrado' || campo === 'precio_unitario') {
          nuevo.parcial_partida = nuevo.metrado * nuevo.precio_unitario;
        }
      }
      return nuevo;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localNombre.trim()) {
      // Actualizar el estado del padre primero
      onNombreChange(localNombre.trim());
      // Guardar pasando el nombre y los datos de partida si es tipo PARTIDA
      if (tipo === 'PARTIDA') {
        // No enviar precio_unitario ni parcial_partida (se calculan desde el APU)
        const partidaDataToSave = {
          unidad_medida: localPartidaData.unidad_medida,
          metrado: localPartidaData.metrado,
          precio_unitario: isEdit && partidaData ? partidaData.precio_unitario : 0,
          parcial_partida: isEdit && partidaData ? partidaData.parcial_partida : 0,
        };
        onSave(localNombre.trim(), partidaDataToSave);
      } else {
        // Para TITULO, pasar también id_especialidad
        onSave(localNombre.trim(), undefined, localIdEspecialidad || null);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {tipo === 'PARTIDA' ? 'Descripción' : 'Nombre'}
        </label>
        <Input
          type="text"
          value={localNombre}
          onChange={(e) => setLocalNombre(e.target.value)}
          placeholder={tipo === 'PARTIDA' ? 'Ingrese la descripción' : 'Ingrese el nombre'}
          autoFocus
          required
          className="text-sm"
        />
      </div>

      {tipo === 'TITULO' && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Especialidad (Opcional)
          </label>
          {localIdEspecialidad && especialidadesCompletasRef.current.has(localIdEspecialidad) ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--background)] text-xs text-[var(--text-primary)]">
                {especialidadesCompletasRef.current.get(localIdEspecialidad)?.nombre}
              </div>
              <button
                type="button"
                onClick={() => setLocalIdEspecialidad(null)}
                className="px-2 py-2 rounded-md bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200"
                title="Limpiar selección"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <SearchInput
              placeholder="Buscar especialidad por nombre, descripción o ID..."
              minChars={0}
              onSearch={buscarEspecialidades}
              onSelect={(item) => {
                setLocalIdEspecialidad(item.id);
              }}
              renderItem={(item) => (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{item.nombre}</span>
                  {item.codigo && (
                    <span className="text-[10px] text-[var(--text-secondary)]">{item.codigo}</span>
                  )}
                </div>
              )}
              showInitialResults={true}
              initialResultsCount={7}
            />
          )}
        </div>
      )}

      {tipo === 'PARTIDA' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Unidad de Medida
              </label>
              <Input
                type="text"
                value={localPartidaData.unidad_medida}
                onChange={(e) => handlePartidaFieldChange('unidad_medida', e.target.value)}
                placeholder="und"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Metrado
              </label>
              <Input
                type="number"
                step="0.0001"
                value={localPartidaData.metrado}
                onChange={(e) => handlePartidaFieldChange('metrado', e.target.value)}
                placeholder="0"
                className="text-sm"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          size="sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!localNombre.trim() || isLoading}
          size="sm"
        >
          {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}

