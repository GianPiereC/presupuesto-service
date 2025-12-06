'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchSelect } from '@/components/ui/search-select';
import { useEspecialidades } from '@/hooks/useEspecialidades';

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
  
  // Optimizar las opciones de especialidad con useMemo
  const especialidadOptions = useMemo(() => {
    if (!especialidades) return [];
    return especialidades.map((esp) => ({
      value: esp.id_especialidad,
      label: esp.nombre,
      description: esp.descripcion,
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
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Especialidad (Opcional)
          </label>
          <SearchSelect
            value={localIdEspecialidad}
            onChange={(value) => {
              setLocalIdEspecialidad(value);
            }}
            options={especialidadOptions}
            placeholder="Buscar especialidad..."
            disabled={isLoadingEspecialidades}
            isLoading={isLoadingEspecialidades}
            emptyMessage="No se encontraron especialidades"
          />
        </div>
      )}

      {tipo === 'PARTIDA' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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

