'use client';

import { Calendar, DollarSign } from 'lucide-react';
import type { Proyecto } from '@/services/proyecto-service';

interface ProyectoCardProps {
  proyecto: Proyecto;
  onClick: () => void;
}

export default function ProyectoCard({ proyecto, onClick }: ProyectoCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[var(--background)] backdrop-blur-sm rounded-lg p-4 cursor-default card-shadow-hover"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            {proyecto.nombre_proyecto}
          </h3>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-medium">Cliente:</span>
              <span>{proyecto.cliente}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-medium">Empresa:</span>
              <span>{proyecto.empresa}</span>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(proyecto.fecha_creacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {proyecto.total_proyecto !== null && proyecto.total_proyecto !== undefined && (
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
                  <DollarSign className="h-3 w-3" />
                  <span>S/ {proyecto.total_proyecto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ml-4">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              proyecto.estado === 'ACTIVO'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : proyecto.estado === 'EN_PROCESO'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : proyecto.estado === 'FINALIZADO'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
            }`}
          >
            {proyecto.estado}
          </span>
        </div>
      </div>
    </div>
  );
}

