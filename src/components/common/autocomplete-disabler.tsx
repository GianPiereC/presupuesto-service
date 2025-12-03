'use client';

import { useEffect } from 'react';

export default function AutocompleteDisabler() {
  useEffect(() => {
    // Función para aplicar autocomplete="off" a todos los inputs
    const disableAutocomplete = (element: Element) => {
      if (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
      ) {
        (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).autocomplete = 'off';
      }
    };

    // Aplicar a todos los elementos existentes
    const applyToExistingElements = () => {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(disableAutocomplete);
    };

    // Aplicar inicialmente
    applyToExistingElements();

    // Crear observer para elementos nuevos
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Aplicar al elemento mismo si es un input
            disableAutocomplete(element);

            // Aplicar a todos los inputs dentro del elemento agregado
            const inputs = element.querySelectorAll('input, textarea, select');
            inputs.forEach(disableAutocomplete);
          }
        });
      });
    });

    // Observar cambios en todo el documento
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // Este componente no renderiza nada
}
