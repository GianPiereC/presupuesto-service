'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Partida } from '@/hooks/usePartidas';
import { cn } from '@/lib/utils';

interface AutocompletePartidaProps {
  value?: string;
  onSelect: (partida: Partida) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  partidas: Partida[];
  id_partida_padre?: string | null; // ID de la partida padre para excluirla
  showInitialResults?: boolean; // Si true, muestra los primeros 5 resultados al hacer focus
  initialResultsCount?: number; // Cantidad de resultados iniciales (default: 5)
}

export default function AutocompletePartida({
  value = '',
  onSelect,
  placeholder = 'Buscar partida...',
  className,
  disabled = false,
  partidas,
  id_partida_padre,
  showInitialResults = false,
  initialResultsCount = 5,
}: AutocompletePartidaProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce para evitar demasiadas búsquedas
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrar partidas según el término de búsqueda y excluir la partida padre
  const partidasFiltradas = React.useMemo(() => {
    // Primero excluir la partida padre si existe
    let partidasDisponibles = partidas;
    if (id_partida_padre) {
      partidasDisponibles = partidas.filter(p => p.id_partida !== id_partida_padre);
    }

    // Si no hay término de búsqueda y se deben mostrar resultados iniciales
    if (!debouncedSearchTerm.trim()) {
      if (showInitialResults && hasLoadedInitial) {
        // Mostrar los primeros N resultados
        return partidasDisponibles.slice(0, initialResultsCount);
      }
      return [];
    }

    // Filtrar por término de búsqueda
    const term = debouncedSearchTerm.toLowerCase();
    return partidasDisponibles.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(term) ||
        p.numero_item.toLowerCase().includes(term)
    );
  }, [partidas, debouncedSearchTerm, id_partida_padre, showInitialResults, hasLoadedInitial, initialResultsCount]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
  };

  const handleSelectPartida = (partida: Partida) => {
    setSearchTerm(partida.descripcion);
    setIsOpen(false);
    setHasLoadedInitial(false); // Resetear para que se vuelvan a mostrar los iniciales
    onSelect(partida);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
    // Si se deben mostrar resultados iniciales y aún no se han cargado
    if (showInitialResults && !hasLoadedInitial && !debouncedSearchTerm.trim()) {
      setHasLoadedInitial(true);
    }
  };

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.height,
        left: 0,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, partidasFiltradas]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative z-10">
        <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-2.5 w-2.5 text-[var(--text-secondary)] pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-6 pr-2 text-xs h-5"
        />
      </div>

      {/* Dropdown de resultados */}
      {isOpen && containerRef.current && (
        <div
          className="absolute z-[99999] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {partidasFiltradas.length === 0 && debouncedSearchTerm && (
            <div className="px-1.5 py-0.5 text-xs text-[var(--text-secondary)] text-center">
              No se encontraron partidas
            </div>
          )}

          {partidasFiltradas.length === 0 && !debouncedSearchTerm && !showInitialResults && (
            <div className="px-1.5 py-0.5 text-xs text-[var(--text-secondary)] text-center">
              Escribe para buscar partidas
            </div>
          )}

          {partidasFiltradas.map((partida) => (
            <button
              key={partida.id_partida}
              type="button"
              onClick={() => handleSelectPartida(partida)}
              className="w-full px-1.5 py-1 text-left hover:bg-[var(--card-bg)]/80 transition-colors border-b border-[var(--border-color)] last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
                    {partida.descripcion}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                  <span className="font-mono">{partida.numero_item}</span>
                  <span>•</span>
                  <span>{partida.unidad_medida}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
