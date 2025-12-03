'use client';

import { Calendar, DollarSign, Building2, Clock } from 'lucide-react';
import type { Proyecto } from '@/services/proyecto-service';

interface ProyectoDetallesProps {
  proyecto: Proyecto;
}

export default function ProyectoDetalles({ proyecto }: ProyectoDetallesProps) {
  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg card-shadow p-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 block mb-0.5">
            ID
          </label>
          <p className="text-[11px] text-[var(--text-primary)]">{proyecto.id_proyecto}</p>
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 block mb-0.5">
            Estado
          </label>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
              proyecto.estado === 'ACTIVO' || proyecto.estado === 'EN CURSO'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : proyecto.estado === 'EN REVISIÓN' || proyecto.estado === 'EN_PROCESO'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : proyecto.estado === 'COMPLETADO' || proyecto.estado === 'CERRADO'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
            }`}
          >
            {proyecto.estado}
          </span>
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 mb-0.5 flex items-center gap-1">
            <Building2 className="h-2.5 w-2.5" />
            Cliente
          </label>
          <p className="text-[11px] text-[var(--text-primary)] truncate">{proyecto.cliente}</p>
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 mb-0.5">
            Empresa
          </label>
          <p className="text-[11px] text-[var(--text-primary)] truncate">{proyecto.empresa}</p>
        </div>

        {proyecto.total_proyecto !== null && proyecto.total_proyecto !== undefined && (
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 mb-0.5 flex items-center gap-1">
              <DollarSign className="h-2.5 w-2.5" />
              Total
            </label>
            <p className="text-[11px] font-medium text-[var(--text-primary)]">
              S/ {proyecto.total_proyecto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)]/70 mb-0.5 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Plazo
          </label>
          <p className="text-[11px] text-[var(--text-primary)]">
            {proyecto.plazo} día{proyecto.plazo !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

