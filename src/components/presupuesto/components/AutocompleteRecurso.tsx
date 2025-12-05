'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [isInModal, setIsInModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detectar si estamos dentro de un modal
  useEffect(() => {
    if (containerRef.current) {
      const modal = containerRef.current.closest('[role="dialog"]') || 
                    containerRef.current.closest('.fixed.inset-0.z-50') ||
                    containerRef.current.closest('[data-modal]');
      const wasInModal = isInModal;
      setIsInModal(!!modal);
      // Si cambió el estado del modal y el dropdown está abierto, actualizar posición
      if (wasInModal !== !!modal && isOpen) {
        queueMicrotask(() => updateDropdownPosition());
      }
    }
  }, [isOpen]);

  // Sincronizar searchTerm con value prop
  useEffect(() => {
    if (value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value]);

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
      const target = event.target as Node;
      // Verificar si el click fue fuera del contenedor y del dropdown
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Usar capture phase para asegurar que se capture antes de que otros handlers lo cancelen
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isOpen]);

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
    if (containerRef.current && inputRef.current && innerContainerRef.current) {
      // Detectar si estamos en un modal en el momento de la llamada
      const modal = containerRef.current.closest('[role="dialog"]') || 
                    containerRef.current.closest('.fixed.inset-0.z-50') ||
                    containerRef.current.closest('[data-modal]');
      const inModal = !!modal;
      
      // getBoundingClientRect() devuelve coordenadas relativas al viewport
      // que es exactamente lo que necesitamos para position: fixed
      const inputRect = inputRef.current.getBoundingClientRect();
      const innerContainerRect = innerContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownMaxHeight = 240; // max-h-60 = 240px
      const gap = 4;
      
      let top: number;
      // En el panel principal: usar el contenedor interno (que incluye icono e input) para perfecta alineación
      // En el modal: usar el input para mantener el comportamiento actual
      let left: number;
      let width: number;
      let showAbove = false;
      
      if (!inModal) {
        // Panel principal: usar contenedor interno para alineación perfecta con icono e input
        left = innerContainerRect.left;
        width = innerContainerRect.width;
        top = inputRect.top - dropdownMaxHeight - gap;
        showAbove = true;
      } else {
        // Modal: usar input para mantener comportamiento actual
        left = inputRect.left;
        width = inputRect.width;
        top = inputRect.bottom + gap;
        const spaceBelow = viewportHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;
        
        // Solo mostrar arriba si realmente no cabe abajo
        if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
          top = inputRect.top - dropdownMaxHeight - gap;
          showAbove = true;
        }
      }
      
      // Asegurar que no se salga por la derecha (pero mantener alineación si es posible)
      if (left + width > viewportWidth) {
        const maxLeft = viewportWidth - width;
        // Solo ajustar si realmente es necesario
        if (maxLeft >= 0) {
          left = maxLeft;
        } else {
          // Si el dropdown es más ancho que el viewport, ajustar ambos
          left = 0;
          width = viewportWidth;
        }
      }
      
      // Asegurar que no se salga por la izquierda
      if (left < 0) {
        const diff = -left;
        left = 0;
        // Reducir el ancho si es necesario para mantener dentro del viewport
        width = Math.max(width - diff, 200); // mínimo 200px
      }
      
      // Asegurar que no se salga por arriba
      if (showAbove && top < 0) {
        top = gap;
      }
      
      // Asegurar que no se salga por abajo
      if (!showAbove && top + dropdownMaxHeight > viewportHeight) {
        top = Math.max(gap, viewportHeight - dropdownMaxHeight - gap);
      }
      
      setDropdownPosition({
        top,
        left,
        width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Usar requestAnimationFrame para asegurar que el DOM esté actualizado (más eficiente que setTimeout)
      requestAnimationFrame(() => {
        updateDropdownPosition();
      });

      // Usar requestAnimationFrame para mejor rendimiento
      let rafId: number | null = null;
      const scheduleUpdate = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          updateDropdownPosition();
        });
      };

      const handleResize = () => scheduleUpdate();
      const handleScroll = () => scheduleUpdate();
      
      // Encontrar todos los contenedores con scroll que contienen el input
      const findScrollContainers = (element: HTMLElement | null): HTMLElement[] => {
        const containers: HTMLElement[] = [];
        let current: HTMLElement | null = element;
        
        while (current && current !== document.body) {
          const overflow = window.getComputedStyle(current).overflow;
          const overflowY = window.getComputedStyle(current).overflowY;
          const overflowX = window.getComputedStyle(current).overflowX;
          
          if (
            overflow === 'auto' || overflow === 'scroll' ||
            overflowY === 'auto' || overflowY === 'scroll' ||
            overflowX === 'auto' || overflowX === 'scroll'
          ) {
            containers.push(current);
          }
          
          current = current.parentElement;
        }
        
        return containers;
      };

      const scrollContainers = findScrollContainers(containerRef.current);
      
      // También buscar contenedores de modal comunes y tablas con scroll
      const modalSelectors = [
        '[role="dialog"]',
        '.fixed.inset-0.z-50',
        '[data-modal]',
        '.modal',
        '.overflow-y-auto',
        '.overflow-auto'
      ];
      
      const additionalContainers: HTMLElement[] = [];
      modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (containerRef.current && el.contains(containerRef.current)) {
            additionalContainers.push(el as HTMLElement);
          }
        });
      });
      
      // Escuchar eventos en window
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      // Escuchar eventos en todos los contenedores con scroll
      scrollContainers.forEach(container => {
        container.addEventListener('scroll', handleScroll, true);
      });
      
      // Escuchar eventos en contenedores adicionales encontrados
      additionalContainers.forEach(container => {
        container.addEventListener('scroll', handleScroll, true);
      });

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        scrollContainers.forEach(container => {
          container.removeEventListener('scroll', handleScroll, true);
        });
        additionalContainers.forEach(container => {
          container.removeEventListener('scroll', handleScroll, true);
        });
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
      <div ref={innerContainerRef} className="relative z-10 w-full">
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
          className="pl-7 pr-8 text-[10px] h-6 w-full"
        />
        {(isLoading || isFetching) && debouncedSearchTerm && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)] animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && typeof window !== 'undefined' && inputRef.current && (
        <>
          {(() => {
            const dropdownContent = (
              <div 
                ref={dropdownRef}
                className="fixed bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  minWidth: isInModal ? '200px' : '0px',
                  zIndex: isInModal ? 999999 : 99999,
                }}
                onClick={(e) => {
                  // Prevenir que el click se propague y cierre el dropdown
                  e.stopPropagation();
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
            );

            // Si está en un modal, usar portal para renderizar en el body
            if (isInModal && typeof document !== 'undefined') {
              return createPortal(dropdownContent, document.body);
            }

            return dropdownContent;
          })()}
        </>
      )}
    </div>
  );
}
