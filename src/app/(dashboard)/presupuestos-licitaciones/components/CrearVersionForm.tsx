'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Presupuesto } from '@/hooks/usePresupuestos';

interface CrearVersionFormProps {
  versiones: Presupuesto[];
  onConfirm: (id_presupuesto_base: string, descripcion_version?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CrearVersionForm({
  versiones,
  onConfirm,
  onCancel,
  isLoading = false,
}: CrearVersionFormProps) {
  // Ordenar versiones por número (mayor primero) y seleccionar la mayor por defecto
  const versionesOrdenadas = useMemo(() => {
    return [...versiones].sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [versiones]);

  const [versionSeleccionada, setVersionSeleccionada] = useState<string>('');
  const [descripcionVersion, setDescripcionVersion] = useState<string>('');

  // Establecer la versión mayor como seleccionada por defecto
  useEffect(() => {
    if (versionesOrdenadas.length > 0 && !versionSeleccionada) {
      setVersionSeleccionada(versionesOrdenadas[0].id_presupuesto);
    }
  }, [versionesOrdenadas, versionSeleccionada]);

  const versionSeleccionadaData = versionesOrdenadas.find((v) => v.id_presupuesto === versionSeleccionada);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionSeleccionada) return;
    onConfirm(versionSeleccionada, descripcionVersion.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Select de versiones */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Seleccionar versión base <span className="text-red-500">*</span>
        </label>
        <select
          value={versionSeleccionada}
          onChange={(e) => setVersionSeleccionada(e.target.value)}
          disabled={isLoading}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {versionesOrdenadas.map((version) => (
            <option key={version.id_presupuesto} value={version.id_presupuesto}>
              Versión {version.version || 1}
              {version.descripcion_version ? ` - ${version.descripcion_version}` : ''}
              {' '}(S/ {version.total_presupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 })})
            </option>
          ))}
        </select>
        {versionSeleccionadaData && (
          <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
            <p>
              <span className="font-medium">Fecha:</span>{' '}
              {new Date(versionSeleccionadaData.fecha_creacion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            {versionSeleccionadaData.descripcion_version && (
              <p>
                <span className="font-medium">Descripción:</span> {versionSeleccionadaData.descripcion_version}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Campo de descripción (opcional) */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Descripción de la nueva versión <span className="text-[var(--text-secondary)]">(opcional)</span>
        </label>
        <Textarea
          value={descripcionVersion}
          onChange={(e) => setDescripcionVersion(e.target.value)}
          disabled={isLoading}
          placeholder="Ej: Versión ajustada por cambios en materiales..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border-color)] rounded-md hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !versionSeleccionada}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creando...' : 'Crear Versión'}
        </button>
      </div>
    </form>
  );
}

