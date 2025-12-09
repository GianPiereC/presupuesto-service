"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "./input";
import LoadingSpinner from "./loading-spinner";

export interface SearchItem {
  id: string;
  nombre: string;
  codigo?: string;
  cantidad?: number;
  precio_actual?: number;
  vigente?: boolean;
}

interface SearchInputProps {
  placeholder?: string;
  minChars?: number;
  onSearch: (query: string) => Promise<SearchItem[]>;
  onSelect: (item: SearchItem) => void;
  renderItem?: (item: SearchItem) => React.ReactNode;
  className?: string;
  inputHeight?: string; // Ej: "h-6", "h-8", etc.
  showInitialResults?: boolean; // Si true, muestra los primeros 7 resultados al hacer click
  initialResultsCount?: number; // Cantidad de resultados iniciales (default: 7)
}

export function SearchInput({
  placeholder = "Buscar...",
  minChars = 3,
  onSearch,
  onSelect,
  renderItem,
  className = "",
  inputHeight,
  showInitialResults = false,
  initialResultsCount = 7,
}: SearchInputProps) {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setItems([]);
    setIsSearching(false);
    setSearchQuery("");
    setSelectedIndex(-1);
    setHasLoadedInitial(false);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
  }, []);

  // Función para cargar resultados iniciales
  const loadInitialResults = useCallback(async () => {
    if (hasLoadedInitial || !showInitialResults) return;
    
    setIsSearching(true);
    try {
      const resultados = await onSearch("");
      // Limitar a los primeros N resultados
      const limitedResults = resultados.slice(0, initialResultsCount);
      setItems(limitedResults);
      setSelectedIndex(-1);
      setHasLoadedInitial(true);
    } catch (error) {
      console.error('Error al cargar resultados iniciales:', error);
    } finally {
      setIsSearching(false);
    }
  }, [showInitialResults, initialResultsCount, hasLoadedInitial, onSearch]);

  const handleFocus = useCallback(() => {
    if (showInitialResults && !hasLoadedInitial) {
      loadInitialResults();
    }
  }, [showInitialResults, hasLoadedInitial, loadInitialResults]);

  const scrollToSelectedItem = useCallback((index: number) => {
    const selectedElement = document.querySelector(`[data-index="${index}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const handleSelect = useCallback((item: SearchItem) => {
    onSelect(item);
    resetState();
  }, [onSelect, resetState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        resetState();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [resetState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!items.length) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev < items.length - 1 ? prev + 1 : prev;
            scrollToSelectedItem(newIndex);
            return newIndex;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : prev;
            scrollToSelectedItem(newIndex);
            return newIndex;
          });
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            handleSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          resetState();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, resetState, handleSelect, scrollToSelectedItem]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      const itemElement = searchRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      if (itemElement) {
        itemElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, items, searchRef, scrollToSelectedItem]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < minChars) {
      setItems([]);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resultados = await onSearch(query);
        setItems(resultados);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error al buscar:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [minChars, onSearch]);

  const defaultRenderItem = useCallback((item: SearchItem) => (
    <div className="flex items-center justify-between">
      <div className="text-[11px] text-[var(--text-primary)] truncate">
        {item.nombre}
      </div>
      {item.vigente !== undefined && (
        <div className={`text-[11px] w-3 h-3 rounded-full ${
          item.vigente ? 'bg-lime-400' : 'bg-rose-400'
        }`} />
      )}
    </div>
  ), []);

  const inputClassName = `w-full ps-6 text-xs ${inputHeight || ''}`;

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="flex items-center gap-1 relative">
        <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] z-10"/>
        <Input 
          type="text" 
          placeholder={placeholder}
          className={inputClassName}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
        />          
      </div>

      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--background)] border border-[var(--border-color)] rounded-md shadow-lg z-20">
          <div className="flex justify-center py-1">
            <LoadingSpinner size={20} />
          </div>
        </div>
      )}

      {!isSearching && items.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--background)] border border-[var(--border-color)] rounded-md shadow-lg z-20">
          <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
            {items.map((item, index) => (
              <div 
                key={item.id}
                data-index={index}
                className={`px-1 hover:bg-blue-200/20 rounded cursor-pointer ${
                  index === selectedIndex ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleSelect(item)}
              >
                {renderItem ? renderItem(item) : defaultRenderItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

