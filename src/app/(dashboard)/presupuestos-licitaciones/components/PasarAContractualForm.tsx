'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface PasarAContractualFormProps {
  versionNumero: number;
  nombrePresupuesto: string;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PasarAContractualForm({
  versionNumero,
  nombrePresupuesto,
  onConfirm,
  onCancel,
  isLoading = false,
}: PasarAContractualFormProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    onConfirm(motivo.trim());
  };

  return (
    <div className="space-y-4">
      {/* Advertencia */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md">
        <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-amber-100">
            Confirmación de Cambio de Fase
          </p>
          <div className="text-xs text-gray-700 dark:text-amber-200 leading-relaxed space-y-1">
            <p>
              La <strong className="font-bold text-gray-900 dark:text-amber-100">Versión {versionNumero}</strong> del presupuesto <strong className="font-bold text-gray-900 dark:text-amber-100">"{nombrePresupuesto}"</strong> pasará a la fase <strong className="font-bold text-gray-900 dark:text-amber-100">CONTRACTUAL</strong>.
            </p>
            <p className="mt-1">
              Las versiones de licitación quedarán disponibles como histórico.
            </p>
          </div>
        </div>
      </div>

      {/* Campo de motivo */}
      <div className="space-y-2">
        <label htmlFor="motivo" className="text-sm font-medium text-[var(--text-primary)]">
          Motivo <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="motivo"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setError('');
          }}
          placeholder="Ingrese el motivo por el cual se pasa a fase contractual..."
          rows={4}
          className="resize-none text-sm"
          disabled={isLoading}
        />
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-xs bg-[var(--background)]/50 hover:bg-[var(--background)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
