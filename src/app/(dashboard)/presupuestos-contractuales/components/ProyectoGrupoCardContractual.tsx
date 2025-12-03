'use client';

import { Building2 } from 'lucide-react';
import PresupuestoGrupoCardContractual from './PresupuestoGrupoCardContractual';
import type { Presupuesto } from '@/hooks/usePresupuestos';
import type { Proyecto } from '@/services/proyecto-service';

interface GrupoPresupuesto {
  id_grupo_version: string;
  presupuestoPadre: Presupuesto;
  versiones: Presupuesto[];
}

interface ProyectoGrupoCardContractualProps {
  proyecto: Proyecto;
  gruposPresupuestos: GrupoPresupuesto[];
}

export default function ProyectoGrupoCardContractual({ proyecto, gruposPresupuestos }: ProyectoGrupoCardContractualProps) {
  const totalPresupuestos = gruposPresupuestos.length;
  const totalVersiones = gruposPresupuestos.reduce((acc, grupo) => acc + grupo.versiones.length, 0);

  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg overflow-hidden card-shadow-hover">
      {/* Header del Proyecto - No desplegable */}
      <div className="p-4 border-b border-[var(--border-color)]/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {proyecto.nombre_proyecto}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span>
                <span className="font-medium text-[var(--text-primary)]">{totalPresupuestos}</span> presupuesto{totalPresupuestos !== 1 ? 's' : ''}
              </span>
              <span>•</span>
              <span>
                <span className="font-medium text-[var(--text-primary)]">{totalVersiones}</span> versión{totalVersiones !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Presupuestos del Proyecto - Siempre visible */}
      <div className="p-4 space-y-4 bg-[var(--card-bg)]/20">
        {gruposPresupuestos.map((grupo) => (
          <PresupuestoGrupoCardContractual
            key={grupo.id_grupo_version}
            grupoId={grupo.id_grupo_version}
            presupuestoPadre={grupo.presupuestoPadre}
            versiones={grupo.versiones}
            nombreProyecto={proyecto.nombre_proyecto}
          />
        ))}
      </div>
    </div>
  );
}

