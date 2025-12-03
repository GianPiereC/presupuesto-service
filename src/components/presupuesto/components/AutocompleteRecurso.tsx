'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRecursosPaginated, Recurso } from '@/hooks/useRecursos';
import { cn } from '@/lib/utils';

interface AutocompleteRecursoProps {
  value?: string;
  onSelect: (recurso: Recurso) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AutocompleteRecurso({
  value = '',
  onSelect,
  placeholder = 'Buscar recurso...',
  className,
  disabled = false,
}: AutocompleteRecursoProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce para evitar demasiadas queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query de recursos con búsqueda
  const { data, isLoading, isFetching } = useRecursosPaginated({
    page: 1,
    itemsPage: 10,
    searchTerm: debouncedSearchTerm || undefined,
  });

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

  const recursos = data?.recursos || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
  };

  const handleSelectRecurso = (recurso: Recurso) => {
    setSearchTerm(recurso.nombre);
    setIsOpen(false);
    onSelect(recurso);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
  };

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative z-10">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)] pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-7 pr-8 text-[10px] h-6"
        />
        {(isLoading || isFetching) && debouncedSearchTerm && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)] animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && typeof window !== 'undefined' && containerRef.current && (
        <div 
          className="fixed z-[99999] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            bottom: `${window.innerHeight - dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {isLoading && debouncedSearchTerm && (
            <div className="px-2 py-1 text-[10px] text-[var(--text-secondary)] text-center">
              Buscando...
            </div>
          )}

          {!isLoading && recursos.length === 0 && debouncedSearchTerm && (
            <div className="px-2 py-1 text-[10px] text-[var(--text-secondary)] text-center">
              No se encontraron recursos
            </div>
          )}

          {!isLoading && recursos.length === 0 && !debouncedSearchTerm && (
            <div className="px-2 py-1 text-[10px] text-[var(--text-secondary)] text-center">
              Escribe para buscar recursos
            </div>
          )}

          {recursos.map((recurso) => (
            <button
              key={recurso.id}
              type="button"
              onClick={() => handleSelectRecurso(recurso)}
              className="w-full px-2 py-1 text-left hover:bg-[var(--card-bg)]/80 transition-colors border-b border-[var(--border-color)] last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[var(--text-primary)] truncate flex-1">
                  {recurso.nombre}
                </span>
                {recurso.unidad?.nombre && (
                  <span className="text-[9px] text-[var(--text-secondary)] whitespace-nowrap">
                    {recurso.unidad.nombre}
                  </span>
                )}
              </div>
            </button>
          ))}

          {data && data.info.pages > 1 && (
            <div className="px-2 py-1 text-[9px] text-[var(--text-secondary)] text-center border-t border-[var(--border-color)]">
              Mostrando {recursos.length} de {data.info.total} resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}

