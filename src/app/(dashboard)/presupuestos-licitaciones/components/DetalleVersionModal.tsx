'use client';

import { DollarSign, Calendar, FileText, Hash, ClipboardList } from 'lucide-react';
import type { Presupuesto } from '@/hooks/usePresupuestos';

interface DetalleVersionModalProps {
  version: Presupuesto;
  nombreProyecto?: string;
}

export default function DetalleVersionModal({
  version,
  nombreProyecto,
}: DetalleVersionModalProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="pb-2 border-b border-[var(--border-color)]">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {version.nombre_presupuesto}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Versión {version.version || 1} • {nombreProyecto}
        </p>
      </div>

      {/* Información principal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">ID Presupuesto</p>
              <p className="text-sm font-medium text-[var(--text-primary)] break-all">{version.id_presupuesto}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Fecha Creación</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {new Date(version.fecha_creacion).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Estado</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  LICITACIÓN
                </span>
                {version.es_activo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                    Activo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Total Presupuesto</p>
              <p className="text-base font-bold text-[var(--text-primary)]">
                S/ {version.total_presupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Costo Directo</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                S/ {version.costo_directo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="h-4 w-4 text-xs text-[var(--text-secondary)] mt-0.5 flex-shrink-0">%</span>
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">IGV / Utilidad</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {version.porcentaje_igv}% / {version.porcentaje_utilidad}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Descripción */}
      {version.descripcion_version && (
        <div className="pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-start gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {version.descripcion_version}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones */}
      {version.observaciones && version.observaciones.trim() !== '' && (
        <div className="pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {version.observaciones}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






