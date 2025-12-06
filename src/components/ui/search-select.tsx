'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Buscar...',
  className,
  disabled = false,
  isLoading = false,
  emptyMessage = 'No se encontraron resultados',
}: SearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isInModal, setIsInModal] = useState(false);
  const [lastSelectedLabel, setLastSelectedLabel] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Calcular la opción seleccionada - usar useMemo para recalcular cuando cambia value u options
  const selectedOption = React.useMemo(() => {
    if (!value) return undefined;
    return options.find(opt => opt.value === value);
  }, [value, options]);
  
  // Actualizar el label seleccionado cuando cambia la opción seleccionada
  useEffect(() => {
    if (selectedOption && selectedOption.label) {
      // Solo actualizar si es diferente para evitar loops
      if (lastSelectedLabel !== selectedOption.label) {
        setLastSelectedLabel(selectedOption.label);
      }
    } else if (!value && lastSelectedLabel) {
      // Solo limpiar si realmente no hay value
      setLastSelectedLabel('');
    }
  }, [selectedOption?.label, selectedOption?.value, value]);

  // Debounce solo para optimización visual (muy rápido)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 50); // Muy rápido para respuesta inmediata

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // Filtrar opciones según el término de búsqueda - filtrar inmediatamente sin esperar debounce
  const filteredOptions = React.useMemo(() => {
    // Si no hay término de búsqueda o está vacío, mostrar todas las opciones
    if (!searchTerm.trim()) {
      return options;
    }
    // Filtrar inmediatamente con el término actual (sin esperar debounce)
    const term = searchTerm.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.description?.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Verificar que el click no sea dentro del contenedor ni del dropdown
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      // Usar un pequeño delay para que el click en el botón se procese primero
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
  };

  const handleSelectOption = (option: SearchSelectOption) => {
    // Guardar el label seleccionado inmediatamente para mostrarlo en el input
    setLastSelectedLabel(option.label);
    
    // Actualizar el valor PRIMERO (antes de cerrar)
    onChange(option.value);
    
    // Limpiar el término de búsqueda
    setSearchTerm('');
    
    // Cerrar el dropdown
    setIsOpen(false);
    
    // Asegurar que el input muestre el valor seleccionado
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
    setIsOpen(false);
  };

  const updateDropdownPosition = () => {
    if (containerRef.current && inputRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const inputRect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: inputRect.bottom + window.scrollY,
        left: inputRect.left + window.scrollX,
        width: inputRect.width,
      });
    }
  };

  const openDropdown = () => {
    if (!disabled && !isOpen) {
      setSearchTerm(''); // Limpiar búsqueda al abrir para mostrar todas las opciones
      setIsOpen(true);
      // Usar múltiples estrategias para asegurar que el dropdown se muestre
      requestAnimationFrame(() => {
        updateDropdownPosition();
        // Hacer que el input sea editable y enfocarlo
        if (inputRef.current) {
          inputRef.current.readOnly = false;
          // Pequeño delay para asegurar que el DOM esté listo
          setTimeout(() => {
            inputRef.current?.focus();
            updateDropdownPosition();
          }, 10);
        }
      });
    }
  };

  const handleInputFocus = () => {
    openDropdown();
  };

  const handleToggleDropdown = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      if (!isOpen) {
        openDropdown();
      } else {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Actualizar posición inmediatamente y luego en el siguiente frame para asegurar que el DOM esté listo
      updateDropdownPosition();
      const timeoutId = setTimeout(() => {
        updateDropdownPosition();
      }, 0);
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, filteredOptions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Sincronizar el valor seleccionado cuando cambia el prop value
  useEffect(() => {
    if (!isOpen) {
      // Limpiar el término de búsqueda cuando se cierra (solo si no hay valor seleccionado)
      if (!value) {
        setSearchTerm('');
      }
    }
  }, [isOpen, value]);

  // Mostrar el término de búsqueda cuando está abierto, o el valor seleccionado cuando está cerrado
  const displayValue = React.useMemo(() => {
    if (isOpen) {
      return searchTerm;
    }
    
    // Cuando está cerrado, mostrar el label de la opción seleccionada
    // Prioridad 1: selectedOption (basado en el value prop actualizado)
    if (selectedOption?.label) {
      return selectedOption.label;
    }
    
    // Prioridad 2: lastSelectedLabel (label guardado inmediatamente después de seleccionar)
    // Esto es importante porque el prop value puede tardar en actualizarse desde el padre
    if (lastSelectedLabel) {
      return lastSelectedLabel;
    }
    
    return '';
  }, [isOpen, searchTerm, selectedOption?.label, lastSelectedLabel]);
  

  return (
    <div 
      ref={containerRef} 
      className={cn('relative w-full', className)}
      onClick={(e) => {
        // Si está cerrado, abrir al hacer click en cualquier parte del contenedor
        if (!isOpen && !disabled && containerRef.current?.contains(e.target as Node)) {
          openDropdown();
        }
      }}
    >
      <div className="relative z-10">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 pr-8 text-sm h-10 cursor-pointer"
          readOnly={!isOpen}
          onClick={(e) => {
            // Si está cerrado, abrir inmediatamente
            if (!isOpen && !disabled) {
              e.stopPropagation();
              openDropdown();
            }
          }}
          onMouseDown={(e) => {
            // Si el input está en modo readOnly (cerrado), abrir el dropdown antes del blur
            if (!isOpen && !disabled) {
              e.preventDefault();
              openDropdown();
            }
          }}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              tabIndex={-1}
            >
              ×
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--text-secondary)] pointer-events-none transition-transform",
              isOpen && "transform rotate-180"
            )}
          />
        </div>
      </div>

      {/* Dropdown de resultados */}
      {isOpen && typeof window !== 'undefined' && (
        <>
          {(() => {
            const dropdownContent = (
              <div
                ref={dropdownRef}
                className="fixed bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto"
                style={{
                  top: `${dropdownPosition.top || 0}px`,
                  left: `${dropdownPosition.left || 0}px`,
                  width: `${dropdownPosition.width || 200}px`,
                  minWidth: isInModal ? '200px' : '0px',
                  zIndex: isInModal ? 999999 : 99999,
                }}
                onClick={(e) => {
                  // Prevenir que el click se propague y cierre el dropdown
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  // Solo prevenir el comportamiento por defecto si no es un botón
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'BUTTON') {
                    e.preventDefault();
                  }
                }}
              >
                {isLoading && (
                  <div className="px-3 py-2 text-sm text-[var(--text-secondary)] text-center">
                    Cargando...
                  </div>
                )}

                {!isLoading && filteredOptions.length === 0 && searchTerm.trim() && (
                  <div className="px-3 py-2 text-sm text-[var(--text-secondary)] text-center">
                    {emptyMessage}
                  </div>
                )}

                {!isLoading && filteredOptions.length === 0 && !searchTerm && options.length === 0 && (
                  <div className="px-3 py-2 text-sm text-[var(--text-secondary)] text-center">
                    No hay opciones disponibles
                  </div>
                )}

                {!isLoading && filteredOptions.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectOption(option);
                      }}
                      onMouseDown={(e) => {
                        // Prevenir que el mousedown cierre el dropdown antes del click
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-[var(--hover-bg)] transition-colors border-b border-[var(--border-color)] last:border-b-0 cursor-pointer",
                        isSelected && "bg-[var(--active-bg)] font-semibold"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                          )}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <span className="text-xs text-[var(--text-secondary)]">✓</span>
                          )}
                        </div>
                        {option.description && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
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

