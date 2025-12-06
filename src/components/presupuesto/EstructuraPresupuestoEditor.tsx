'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, Scissors, Clipboard, ArrowLeft, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui';
import Modal from '@/components/ui/modal';
import CrearPartidasTitulosForm from './components/CrearPartidasTitulosForm';
import DetallePartidaPanel, { type PartidaLocal } from './components/DetallePartidaPanel';
import ModalAgregarSubPartida from './components/ModalAgregarSubPartida';
import { useEstructuraPresupuesto } from '@/hooks/usePresupuestos';
import { useCreateTitulo, useUpdateTitulo, useDeleteTitulo } from '@/hooks/useTitulos';
import { useCreatePartida, useUpdatePartida, useDeletePartida } from '@/hooks/usePartidas';
import { useConfirm } from '@/context/confirm-context';
import { useQueryClient } from '@tanstack/react-query';
import { executeMutation } from '@/services/graphql-client';
import { BATCH_ESTRUCTURA_PRESUPUESTO_MUTATION } from '@/graphql/mutations/estructura-batch.mutations';
import toast from 'react-hot-toast';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

type ModoEditor = 'edicion' | 'lectura' | 'licitacion' | 'meta' | 'contractual';

interface Titulo {
  id_titulo: string;
  id_presupuesto: string;
  id_titulo_padre: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: 'TITULO' | 'SUBTITULO';
  orden: number;
  total_parcial: number;
  id_especialidad?: string | null;
}

interface Partida {
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre: string | null;
  nivel_partida: number;
  numero_item: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
  orden: number;
  estado: 'Activa' | 'Inactiva';
}

interface EstructuraPresupuestoEditorProps {
  id_presupuesto: string;
  id_proyecto?: string;
  nombre_presupuesto?: string;
  modo?: ModoEditor;
  rutaRetorno?: string; // Ruta a la que volver cuando se hace clic en el botón de volver
}


// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function EstructuraPresupuestoEditor({
  id_presupuesto,
  id_proyecto,
  nombre_presupuesto = 'Presupuesto',
  modo = 'edicion',
  rutaRetorno,
}: EstructuraPresupuestoEditorProps) {
  const router = useRouter();
  const [titulosColapsados, setTitulosColapsados] = useState<Set<string>>(new Set());
  const [partidasColapsadas, setPartidasColapsadas] = useState<Set<string>>(new Set());
  const [itemSeleccionado, setItemSeleccionado] = useState<string | null>(null);
  const [itemCortado, setItemCortado] = useState<string | null>(null);

  // Estado para el panel redimensionable (porcentaje del panel inferior, inicialmente 25%)
  const [panelInferiorHeight, setPanelInferiorHeight] = useState(25);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener estructura del presupuesto desde el backend
  const { data: estructuraData, isLoading, error } = useEstructuraPresupuesto(id_presupuesto);

  // Hooks para mutaciones
  const createTitulo = useCreateTitulo();
  const updateTitulo = useUpdateTitulo();
  const deleteTitulo = useDeleteTitulo();
  const createPartida = useCreatePartida();
  const updatePartida = useUpdatePartida();
  const deletePartida = useDeletePartida();

  // Hook para confirmaciones
  const { confirm } = useConfirm();

  // Query client para invalidar queries manualmente
  const queryClient = useQueryClient();

  // Estado local para manejar los datos (se actualiza cuando llegan los datos del backend)
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);

  // Estado para datos originales (para comparar cambios)
  const [titulosOriginales, setTitulosOriginales] = useState<Titulo[]>([]);
  const [partidasOriginales, setPartidasOriginales] = useState<Partida[]>([]);

  // Estado para items eliminados (se guardan cuando se presiona "Guardar cambios")
  const [titulosEliminados, setTitulosEliminados] = useState<Set<string>>(new Set());
  const [partidasEliminadas, setPartidasEliminadas] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Estado para subpartidas que necesitan creación de APU
  const [subpartidasParaCrearApu, setSubpartidasParaCrearApu] = useState<Map<string, PartidaLocal>>(new Map());

  // Estado para subpartidas pendientes de agregar al panel
  const [subpartidasPendientes, setSubpartidasPendientes] = useState<PartidaLocal[]>([]);

  // Contador para generar IDs temporales únicos
  const contadorIdTemporal = useRef(0);

  // Obtener id_proyecto de los datos del presupuesto
  const id_proyecto_real = estructuraData?.presupuesto?.id_proyecto || id_proyecto;

  // Actualizar estado local cuando llegan los datos del backend
  useEffect(() => {
    if (estructuraData) {
      setTitulos(estructuraData.titulos);
      setPartidas(estructuraData.partidas);
      // Guardar copia de los datos originales para comparar cambios
      setTitulosOriginales(JSON.parse(JSON.stringify(estructuraData.titulos)));
      setPartidasOriginales(JSON.parse(JSON.stringify(estructuraData.partidas)));
      // Limpiar eliminados cuando se recargan los datos
      setTitulosEliminados(new Set());
      setPartidasEliminadas(new Set());
    }
  }, [estructuraData]);

  // Estados para el modal (títulos y partidas)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoItemModal, setTipoItemModal] = useState<'TITULO' | 'PARTIDA'>('PARTIDA');
  const [tituloEditando, setTituloEditando] = useState<Titulo | null>(null);
  const [partidaEditando, setPartidaEditando] = useState<Partida | null>(null);
  const [nombreItem, setNombreItem] = useState('');

  // Estado para el modal de agregar sub partida
  const [modalAgregarSubPartidaAbierto, setModalAgregarSubPartidaAbierto] = useState(false);
  const [subPartidaParaAgregar, setSubPartidaParaAgregar] = useState<PartidaLocal | null>(null);
  const [subPartidaParaEditar, setSubPartidaParaEditar] = useState<{ id: string; recursos: any[]; idPartidaOriginal?: string | null; rendimiento?: number; jornada?: number; descripcion?: string } | null>(null);
  const [subPartidaParaActualizar, setSubPartidaParaActualizar] = useState<PartidaLocal | null>(null);

  // ============================================================================
  // FUNCIONES DE UTILIDAD PARA BLOQUES
  // ============================================================================

  /**
   * Obtiene todos los IDs de un bloque (título + todos sus descendientes)
   */
  const obtenerIdsBloqueTitulo = useCallback((id_titulo: string): string[] => {
    const ids: string[] = [id_titulo];

    // Agregar títulos hijos recursivamente
    const hijosTitulos = titulos.filter(t => t.id_titulo_padre === id_titulo);
    hijosTitulos.forEach(hijo => {
      ids.push(...obtenerIdsBloqueTitulo(hijo.id_titulo));
    });

    // Agregar partidas directas del título
    const partidasDirectas = partidas.filter(p => p.id_titulo === id_titulo && p.id_partida_padre === null);
    partidasDirectas.forEach(partida => {
      ids.push(...obtenerIdsBloquePartida(partida.id_partida));
    });

    return ids;
  }, [titulos, partidas]);

  /**
   * Obtiene todos los IDs de un bloque de partida (partida + todas sus subpartidas)
   */
  const obtenerIdsBloquePartida = useCallback((id_partida: string): string[] => {
    const ids: string[] = [id_partida];

    // Agregar subpartidas recursivamente
    const subpartidas = partidas.filter(p => p.id_partida_padre === id_partida);
    subpartidas.forEach(subpartida => {
      ids.push(...obtenerIdsBloquePartida(subpartida.id_partida));
    });

    return ids;
  }, [partidas]);

  /**
   * Obtiene el tipo de item (TITULO o PARTIDA) por su ID
   */
  const obtenerTipoItem = useCallback((id: string): 'TITULO' | 'PARTIDA' | null => {
    if (titulos.some(t => t.id_titulo === id)) return 'TITULO';
    if (partidas.some(p => p.id_partida === id)) return 'PARTIDA';
    return null;
  }, [titulos, partidas]);

  /**
   * Calcula el nivel dinámicamente basándose en la jerarquía actual
   * El nivel se calcula contando la profundidad desde la raíz
   */
  const calcularNivelDinamico = useCallback((id_titulo: string): number => {
    const titulo = titulos.find(t => t.id_titulo === id_titulo);
    if (!titulo) return 1;

    // Si no tiene padre, es nivel 1
    if (!titulo.id_titulo_padre) return 1;

    // Si tiene padre, calcular recursivamente
    return calcularNivelDinamico(titulo.id_titulo_padre) + 1;
  }, [titulos]);

  /**
   * Actualiza el nivel de un título y todos sus descendientes
   */
  const actualizarNivelTituloYDescendientes = useCallback((id_titulo: string, nuevoNivel: number) => {
    setTitulos(prev => prev.map(t => {
      if (t.id_titulo === id_titulo) {
        return { ...t, nivel: nuevoNivel };
      }
      // Actualizar hijos
      if (t.id_titulo_padre === id_titulo) {
        return { ...t, nivel: nuevoNivel + 1 };
      }
      return t;
    }));

    // Actualizar recursivamente todos los descendientes
    const hijos = titulos.filter(t => t.id_titulo_padre === id_titulo);
    hijos.forEach(hijo => {
      actualizarNivelTituloYDescendientes(hijo.id_titulo, nuevoNivel + 1);
    });
  }, [titulos]);

  // ============================================================================
  // ORDENAMIENTO MIXTO (TÍTULOS + PARTIDAS INTERCALADOS)
  // ============================================================================

  /**
   * Crea una estructura unificada que mezcla títulos y partidas por orden
   * dentro del mismo padre, respetando la jerarquía
   */
  type ItemUnificado =
    | { tipo: 'TITULO'; data: Titulo }
    | { tipo: 'PARTIDA'; data: Partida };

  /**
   * Verifica si un título tiene algún ancestro colapsado (recursivamente)
   * Retorna true si algún ancestro (padre, abuelo, etc.) está colapsado
   */
  const tieneAncestroColapsado = useCallback((id_titulo: string | null): boolean => {
    if (!id_titulo) return false;

    const titulo = titulos.find(t => t.id_titulo === id_titulo);
    if (!titulo) return false;

    // Si este título está colapsado, retornar true
    if (titulosColapsados.has(id_titulo)) return true;

    // Si tiene padre, verificar recursivamente
    if (titulo.id_titulo_padre) {
      return tieneAncestroColapsado(titulo.id_titulo_padre);
    }

    return false;
  }, [titulos, titulosColapsados]);

  /**
   * Verifica si un item debe estar oculto por colapso de ancestros
   * Los títulos raíz (sin padre) NUNCA deben estar ocultos
   */
  const estaOcultoPorColapso = useCallback((item: Titulo | Partida): boolean => {
    // Si es un título sin padre (raíz), nunca ocultarlo
    if ('id_titulo_padre' in item && !item.id_titulo_padre) {
      return false;
    }

    if ('id_titulo_padre' in item && item.id_titulo_padre) {
      // Es un título con padre: verificar si algún ancestro está colapsado
      return tieneAncestroColapsado(item.id_titulo_padre);
    }

    if ('id_partida_padre' in item && item.id_partida_padre) {
      // Es una subpartida: verificar si la partida padre está colapsada
      if (partidasColapsadas.has(item.id_partida_padre)) return true;
    }

    // Es una partida principal: verificar si el título al que pertenece tiene ancestros colapsados
    if ('id_titulo' in item && item.id_titulo) {
      const tituloPadre = titulos.find(t => t.id_titulo === item.id_titulo);
      if (tituloPadre) {
        // Si el título padre es raíz y está colapsado, ocultar la partida
        if (!tituloPadre.id_titulo_padre && titulosColapsados.has(tituloPadre.id_titulo)) {
          return true;
        }
        // Si el título padre tiene ancestros colapsados, ocultar la partida
        return tieneAncestroColapsado(tituloPadre.id_titulo);
      }
    }

    return false;
  }, [titulosColapsados, partidasColapsadas, titulos, tieneAncestroColapsado]);

  // Crear índices para acceso rápido (optimización de rendimiento)
  const titulosPorPadre = useMemo(() => {
    const map = new Map<string | null, Titulo[]>();
    titulos.forEach(titulo => {
      const padre = titulo.id_titulo_padre;
      if (!map.has(padre)) {
        map.set(padre, []);
      }
      map.get(padre)!.push(titulo);
    });
    // Ordenar cada grupo por orden
    map.forEach((grupo) => grupo.sort((a, b) => a.orden - b.orden));
    return map;
  }, [titulos]);

  const partidasPorTituloYPadre = useMemo(() => {
    const map = new Map<string, Map<string | null, Partida[]>>();
    partidas.forEach(partida => {
      if (!map.has(partida.id_titulo)) {
        map.set(partida.id_titulo, new Map());
      }
      const partidasMap = map.get(partida.id_titulo)!;
      const padre = partida.id_partida_padre;
      if (!partidasMap.has(padre)) {
        partidasMap.set(padre, []);
      }
      partidasMap.get(padre)!.push(partida);
    });
    // Ordenar cada grupo por orden
    map.forEach((partidasMap) => {
      partidasMap.forEach((grupo) => grupo.sort((a, b) => a.orden - b.orden));
    });
    return map;
  }, [partidas]);

  const estructuraUnificada = useMemo(() => {
    const resultado: ItemUnificado[] = [];
    const itemsProcesados = new Set<string>(); // Para evitar duplicados

    /**
     * Función recursiva para construir la estructura unificada
     * Maneja el ordenamiento mixto dinámico de títulos y partidas
     * Respeta el estado de colapso: si un título está colapsado, no incluye sus descendientes
     * Los títulos raíz (sin padre) siempre se muestran, incluso si están colapsados
     */
    const construirEstructura = (id_padre: string | null) => {
      // Si el padre está colapsado, no procesar sus hijos (pero el padre mismo ya se mostró)
      if (id_padre && titulosColapsados.has(id_padre)) {
        return;
      }

      // Obtener todos los items del mismo padre (títulos y partidas) mezclados
      const items: ItemUnificado[] = [];

      // Agregar títulos hijos del padre (usando índice optimizado)
      const titulosHijos = titulosPorPadre.get(id_padre) || [];
      titulosHijos.forEach(titulo => {
        items.push({ tipo: 'TITULO', data: titulo });
      });

      // Agregar partidas del mismo nivel (usando índice optimizado)
      if (id_padre !== null) {
        const partidasMap = partidasPorTituloYPadre.get(id_padre);
        if (partidasMap) {
          const partidasPrincipales = partidasMap.get(null) || [];
          partidasPrincipales.forEach(partida => {
            items.push({ tipo: 'PARTIDA', data: partida });
          });
        }
      }

      // Ordenar por orden (títulos y partidas mezclados según su campo 'orden')
      items.sort((a, b) => {
        const ordenA = a.data.orden;
        const ordenB = b.data.orden;
        return ordenA - ordenB;
      });

      // Agregar items ordenados al resultado y procesar recursivamente
      items.forEach(item => {
        // Crear clave única para evitar duplicados
        const clave = item.tipo === 'TITULO' ? `TIT-${item.data.id_titulo}` : `PAR-${item.data.id_partida}`;

        // Solo agregar si no se ha procesado antes
        if (!itemsProcesados.has(clave)) {
          itemsProcesados.add(clave);
          resultado.push(item);

          // Si es un título y NO está colapsado, agregar recursivamente sus hijos
          // Esto asegura que todos los descendientes se oculten cuando un título está colapsado
          if (item.tipo === 'TITULO' && !titulosColapsados.has(item.data.id_titulo)) {
            construirEstructura(item.data.id_titulo);
          }
        }

        // NOTA: Las subpartidas NO se muestran aquí, se mostrarán junto con los recursos
        // dentro de cada partida en otra sección/componente
      });
    };

    construirEstructura(null);
    return resultado;
  }, [titulosPorPadre, partidasPorTituloYPadre, titulosColapsados]);

  /**
   * Obtiene partidas de un título (para renderizado)
   */
  const partidasPorTitulo = useMemo(() => {
    const partidasMap = new Map<string, Partida[]>();
    partidas.forEach(partida => {
      if (!partidasMap.has(partida.id_titulo)) {
        partidasMap.set(partida.id_titulo, []);
      }
      partidasMap.get(partida.id_titulo)!.push(partida);
    });
    return partidasMap;
  }, [partidas]);

  // ============================================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================================

  /**
   * Calcula dinámicamente el numero_item basado en la posición jerárquica
   */
  const calcularNumeroItem = useCallback((item: Titulo | Partida, tipo: 'TITULO' | 'PARTIDA'): string => {
    if (tipo === 'TITULO') {
      const titulo = item as Titulo;

      // Si no tiene padre, es nivel raíz
      if (!titulo.id_titulo_padre) {
        // Contar cuántos títulos raíz hay antes de este (según orden)
        const titulosRaiz = titulos
          .filter(t => t.id_titulo_padre === null)
          .sort((a, b) => a.orden - b.orden);
        const indice = titulosRaiz.findIndex(t => t.id_titulo === titulo.id_titulo);
        return String(indice + 1);
      }

      // Tiene padre, calcular basado en el padre
      const padre = titulos.find(t => t.id_titulo === titulo.id_titulo_padre);
      if (!padre) return '0';

      // Obtener todos los items del mismo padre (títulos y partidas) ordenados
      const itemsMismoPadre: Array<{ id: string; tipo: 'TITULO' | 'PARTIDA'; orden: number }> = [];

      // Títulos hermanos
      titulos
        .filter(t => t.id_titulo_padre === titulo.id_titulo_padre)
        .forEach(t => itemsMismoPadre.push({ id: t.id_titulo, tipo: 'TITULO', orden: t.orden }));

      // Partidas del padre
      partidas
        .filter(p => p.id_titulo === titulo.id_titulo_padre && p.id_partida_padre === null)
        .forEach(p => itemsMismoPadre.push({ id: p.id_partida, tipo: 'PARTIDA', orden: p.orden }));

      // Ordenar por orden
      itemsMismoPadre.sort((a, b) => a.orden - b.orden);

      // Encontrar posición del título actual
      const indice = itemsMismoPadre.findIndex(item => item.id === titulo.id_titulo && item.tipo === 'TITULO');
      const numeroSecuencia = String(indice + 1);

      // Calcular numero_item del padre recursivamente
      const numeroPadre = calcularNumeroItem(padre, 'TITULO');
      return `${numeroPadre}.${numeroSecuencia}`;
    } else {
      // Es una partida
      const partida = item as Partida;

      // Obtener el título al que pertenece
      const tituloPadre = titulos.find(t => t.id_titulo === partida.id_titulo);
      if (!tituloPadre) return '0';

      // Obtener todos los items del mismo nivel (títulos hijos y partidas del título padre) ordenados
      const itemsMismoPadre: Array<{ id: string; tipo: 'TITULO' | 'PARTIDA'; orden: number }> = [];

      // Títulos hijos del título padre (hermanos de la partida)
      titulos
        .filter(t => t.id_titulo_padre === partida.id_titulo)
        .forEach(t => itemsMismoPadre.push({ id: t.id_titulo, tipo: 'TITULO', orden: t.orden }));

      // Partidas del título padre (incluyendo la actual)
      partidas
        .filter(p => p.id_titulo === partida.id_titulo && p.id_partida_padre === null)
        .forEach(p => itemsMismoPadre.push({ id: p.id_partida, tipo: 'PARTIDA', orden: p.orden }));

      // Ordenar por orden (títulos y partidas mezclados)
      itemsMismoPadre.sort((a, b) => a.orden - b.orden);

      // Encontrar posición de la partida actual
      const indice = itemsMismoPadre.findIndex(item => item.id === partida.id_partida && item.tipo === 'PARTIDA');
      const numeroSecuencia = String(indice + 1);

      // Calcular numero_item del título padre recursivamente
      const numeroPadre = calcularNumeroItem(tituloPadre, 'TITULO');
      return `${numeroPadre}.${numeroSecuencia}`;
    }
  }, [titulos, partidas]);

  const tieneHijosTitulo = useCallback((id_titulo: string): boolean => {
    return titulos.some(t => t.id_titulo_padre === id_titulo);
  }, [titulos]);

  const tienePartidas = useCallback((id_titulo: string): boolean => {
    return partidas.some(p => p.id_titulo === id_titulo && p.id_partida_padre === null);
  }, [partidas]);

  const tieneSubpartidas = useCallback((id_partida: string): boolean => {
    return partidas.some(p => p.id_partida_padre === id_partida);
  }, [partidas]);

  const getPartidasDeTitulo = useCallback((id_titulo: string): Partida[] => {
    return partidasPorTitulo.get(id_titulo) || [];
  }, [partidasPorTitulo]);

  const getSubpartidas = useCallback((id_partida: string): Partida[] => {
    return partidas.filter(p => p.id_partida_padre === id_partida);
  }, [partidas]);

  // ============================================================================
  // HANDLERS DE ACCIONES
  // ============================================================================

  const handleToggleColapsoTitulo = (id_titulo: string) => {
    setTitulosColapsados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id_titulo)) {
        nuevo.delete(id_titulo);
      } else {
        nuevo.add(id_titulo);
      }
      return nuevo;
    });
  };

  const handleToggleColapsoPartida = (id_partida: string) => {
    setPartidasColapsadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id_partida)) {
        nuevo.delete(id_partida);
      } else {
        nuevo.add(id_partida);
      }
      return nuevo;
    });
  };

  const handleSeleccionar = (id: string) => {
    setItemSeleccionado(id === itemSeleccionado ? null : id);
  };

  // Detectar si el item seleccionado es una partida
  const partidaSeleccionada = useMemo(() => {
    if (!itemSeleccionado) return null;
    const tipo = obtenerTipoItem(itemSeleccionado);
    if (tipo === 'PARTIDA') {
      return itemSeleccionado;
    }
    return null;
  }, [itemSeleccionado, obtenerTipoItem]);

  // Ajustar tamaño del panel automáticamente cuando se selecciona una partida
  useEffect(() => {
    if (partidaSeleccionada && panelInferiorHeight < 40) {
      setPanelInferiorHeight(40);
    } else if (!partidaSeleccionada && panelInferiorHeight > 25) {
      // Opcional: reducir cuando no hay partida seleccionada
      // setPanelInferiorHeight(25);
    }
  }, [partidaSeleccionada]);

  // Lógica de redimensionamiento del panel (optimizada con requestAnimationFrame)
  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;
    let lastUpdateTime = 0;
    const throttleMs = 8; // ~120fps para suavidad

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();

      // Throttle: solo procesar si ha pasado suficiente tiempo
      if (now - lastUpdateTime < throttleMs) {
        return;
      }

      // Cancelar cualquier RAF pendiente
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      // Usar requestAnimationFrame para sincronizar con el ciclo de renderizado
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerHeight = containerRect.height;

        // Posición del mouse relativa al contenedor (desde el top)
        const mouseY = e.clientY - containerRect.top;

        // Calcular porcentaje del panel inferior basado en la posición del mouse
        // Cuando el mouse BAJA (mouseY aumenta hacia abajo), el panel inferior debe HACERSE PEQUEÑO
        // Cuando el mouse SUBE (mouseY disminuye hacia arriba), el panel inferior debe CRECER
        // Por lo tanto: porcentaje = ((containerHeight - mouseY) / containerHeight) * 100
        const newHeight = ((containerHeight - mouseY) / containerHeight) * 100;

        // Limitar entre 15% y 70%
        const clampedHeight = Math.max(15, Math.min(70, newHeight));
        setPanelInferiorHeight(clampedHeight);
        lastUpdateTime = now;
      });
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsResizing(false);
    };

    // Agregar listeners con passive para mejor rendimiento
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    // Cleanup
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleCortar = (id: string) => {
    setItemCortado(id);
  };

  /**
   * Reordena los items de un padre para asegurar ordenes secuenciales (1, 2, 3, ...)
   */
  const reordenarItemsPadre = useCallback((idPadre: string | null) => {
    // Reordenar títulos
    setTitulos(prevTitulos => {
      const titulosDelPadre = prevTitulos
        .filter(t => t.id_titulo_padre === idPadre)
        .sort((a, b) => a.orden - b.orden);

      return prevTitulos.map(t => {
        if (t.id_titulo_padre === idPadre) {
          const indice = titulosDelPadre.findIndex(tit => tit.id_titulo === t.id_titulo);
          return { ...t, orden: indice + 1 };
        }
        return t;
      });
    });

    // Reordenar partidas (necesitamos el estado actualizado de titulos)
    setTitulos(prevTitulos => {
      setPartidas(prevPartidas => {
        const partidasDelPadre = prevPartidas
          .filter(p => {
            if (idPadre === null) {
              return prevTitulos.some(t => t.id_titulo === p.id_titulo && t.id_titulo_padre === null) && p.id_partida_padre === null;
            }
            return p.id_titulo === idPadre && p.id_partida_padre === null;
          })
          .sort((a, b) => a.orden - b.orden);

        return prevPartidas.map(p => {
          const esPartidaDelPadre = idPadre === null
            ? prevTitulos.some(t => t.id_titulo === p.id_titulo && t.id_titulo_padre === null) && p.id_partida_padre === null
            : p.id_titulo === idPadre && p.id_partida_padre === null;

          if (esPartidaDelPadre) {
            const indice = partidasDelPadre.findIndex(part => part.id_partida === p.id_partida);
            return { ...p, orden: indice + 1 };
          }
          return p;
        });
      });

      return prevTitulos;
    });
  }, []);

  /**
   * Obtiene todos los items del mismo padre (títulos y partidas) ordenados
   */
  const obtenerItemsMismoPadre = useCallback((id: string): Array<{ id: string; tipo: 'TITULO' | 'PARTIDA'; orden: number }> => {
    const tipo = obtenerTipoItem(id);
    if (!tipo) return [];

    let id_padre: string | null = null;

    if (tipo === 'TITULO') {
      const titulo = titulos.find(t => t.id_titulo === id);
      if (!titulo) return [];
      id_padre = titulo.id_titulo_padre;

      // Obtener títulos del mismo padre
      const titulosMismoPadre = titulos
        .filter(t => t.id_titulo_padre === id_padre)
        .map(t => ({ id: t.id_titulo, tipo: 'TITULO' as const, orden: t.orden }));

      // Obtener partidas del mismo padre (si el padre es un título)
      let partidasMismoPadre: Array<{ id: string; tipo: 'PARTIDA'; orden: number }> = [];
      if (id_padre) {
        partidasMismoPadre = partidas
          .filter(p => p.id_titulo === id_padre && p.id_partida_padre === null)
          .map(p => ({ id: p.id_partida, tipo: 'PARTIDA' as const, orden: p.orden }));
      } else {
        // Si no hay padre, las partidas pertenecen a títulos raíz
        // Por simplicidad, solo consideramos partidas de títulos raíz
        const titulosRaiz = titulos.filter(t => t.id_titulo_padre === null);
        titulosRaiz.forEach(tituloRaiz => {
          const partidasTitulo = partidas
            .filter(p => p.id_titulo === tituloRaiz.id_titulo && p.id_partida_padre === null)
            .map(p => ({ id: p.id_partida, tipo: 'PARTIDA' as const, orden: p.orden }));
          partidasMismoPadre.push(...partidasTitulo);
        });
      }

      // Combinar y ordenar
      return [...titulosMismoPadre, ...partidasMismoPadre].sort((a, b) => a.orden - b.orden);
    } else {
      // Es una partida principal (sin id_partida_padre)
      const partida = partidas.find(p => p.id_partida === id);
      if (!partida) return [];

      // Para partidas principales, el "padre" es el título al que pertenecen
      // Necesitamos obtener todos los items del mismo título (títulos hijos y partidas)
      const id_titulo = partida.id_titulo;

      const itemsMismoPadre: Array<{ id: string; tipo: 'TITULO' | 'PARTIDA'; orden: number }> = [];

      // Obtener títulos hijos del título al que pertenece la partida
      titulos
        .filter(t => t.id_titulo_padre === id_titulo)
        .forEach(t => itemsMismoPadre.push({ id: t.id_titulo, tipo: 'TITULO', orden: t.orden }));

      // Obtener partidas del mismo título (solo principales, sin id_partida_padre)
      partidas
        .filter(p => p.id_titulo === id_titulo && p.id_partida_padre === null)
        .forEach(p => itemsMismoPadre.push({ id: p.id_partida, tipo: 'PARTIDA', orden: p.orden }));

      // Ordenar por orden (títulos y partidas mezclados)
      return itemsMismoPadre.sort((a, b) => a.orden - b.orden);
    }
  }, [titulos, partidas, obtenerTipoItem]);

  /**
   * Crea un nuevo título
   * - Si no hay item seleccionado: crea al final de los títulos sin padre (raíz)
   * - Si hay un título seleccionado: crea como HIJO de ese título
   * - Si hay una partida seleccionada: crea como hijo del título al que pertenece la partida
   */
  const handleCrearTitulo = useCallback(() => {
    let nuevoIdPadre: string | null = null;
    let nuevoNivel = 1;
    let nuevoOrden = 1;

    if (itemSeleccionado) {
      const tipoSeleccionado = obtenerTipoItem(itemSeleccionado);

      if (tipoSeleccionado === 'TITULO') {
        // Si se selecciona un título, crear como HIJO de ese título
        const tituloSeleccionado = titulos.find(t => t.id_titulo === itemSeleccionado);
        if (tituloSeleccionado) {
          nuevoIdPadre = tituloSeleccionado.id_titulo; // El título seleccionado será el padre
          nuevoNivel = tituloSeleccionado.nivel + 1; // Un nivel más profundo

          // Obtener todos los hijos directos del título seleccionado (solo títulos hijos)
          const hijosDirectos = titulos.filter(t => t.id_titulo_padre === tituloSeleccionado.id_titulo);
          nuevoOrden = hijosDirectos.length > 0
            ? Math.max(...hijosDirectos.map(t => t.orden)) + 1
            : 1;
        }
      } else {
        // Si se selecciona una partida, crear como hijo del título al que pertenece la partida
        const partidaSeleccionada = partidas.find(p => p.id_partida === itemSeleccionado);
        if (partidaSeleccionada) {
          nuevoIdPadre = partidaSeleccionada.id_titulo; // El título de la partida será el padre

          // Calcular el nivel basándose en el título padre
          const tituloPadre = titulos.find(t => t.id_titulo === partidaSeleccionada.id_titulo);
          if (tituloPadre) {
            nuevoNivel = tituloPadre.nivel + 1;
          }

          // Obtener todos los hijos directos del título
          const hijosDirectos = titulos.filter(t => t.id_titulo_padre === partidaSeleccionada.id_titulo);
          nuevoOrden = hijosDirectos.length > 0
            ? Math.max(...hijosDirectos.map(t => t.orden)) + 1
            : 1;
        }
      }
    } else {
      // No hay item seleccionado: crear al final de los títulos raíz (sin padre)
      const titulosRaiz = titulos.filter(t => t.id_titulo_padre === null);
      nuevoOrden = titulosRaiz.length > 0
        ? Math.max(...titulosRaiz.map(t => t.orden)) + 1
        : 1;
    }

    // Preparar el modal para crear nuevo título
    setTituloEditando(null);
    setPartidaEditando(null);
    setNombreItem('');
    setTipoItemModal('TITULO');
    setModalAbierto(true);

    // Guardar temporalmente los datos del nuevo título
    (window as any).__nuevoTituloTemp = {
      id_padre: nuevoIdPadre,
      nivel: nuevoNivel,
      orden: nuevoOrden,
    };
  }, [itemSeleccionado, titulos, partidas, obtenerTipoItem]);

  /**
   * Crea un nuevo partida (prepara el modal)
   * - Si no hay item seleccionado: crea al final de los títulos raíz
   * - Si hay un título seleccionado: crea como partida del título
   * - Si hay una partida seleccionada: crea como hermano de la partida
   */
  const handleCrearPartida = useCallback(() => {
    let nuevoIdTitulo: string | null = null;
    let nuevoNivel = 1;
    let nuevoOrden = 1;

    if (itemSeleccionado) {
      const tipoSeleccionado = obtenerTipoItem(itemSeleccionado);

      if (tipoSeleccionado === 'TITULO') {
        // Si se selecciona un título, crear partida dentro de ese título
        nuevoIdTitulo = itemSeleccionado;
        const tituloSeleccionado = titulos.find(t => t.id_titulo === itemSeleccionado);
        if (tituloSeleccionado) {
          nuevoNivel = 1;

          // Obtener todas las partidas del título
          const partidasDelTitulo = partidas.filter(p => p.id_titulo === nuevoIdTitulo && p.id_partida_padre === null);
          nuevoOrden = partidasDelTitulo.length > 0
            ? Math.max(...partidasDelTitulo.map(p => p.orden)) + 1
            : 1;
        }
      } else {
        // Si se selecciona una partida, crear como hermano (mismo título)
        const partidaSeleccionada = partidas.find(p => p.id_partida === itemSeleccionado);
        if (partidaSeleccionada) {
          nuevoIdTitulo = partidaSeleccionada.id_titulo;
          nuevoNivel = partidaSeleccionada.nivel_partida;

          // Obtener todos los hermanos (títulos y partidas) del mismo título
          const hermanos = obtenerItemsMismoPadre(itemSeleccionado);
          nuevoOrden = hermanos.length > 0
            ? Math.max(...hermanos.map(h => h.orden)) + 1
            : 1;
        }
      }
    } else {
      // No hay item seleccionado: crear en el primer título raíz
      const titulosRaiz = titulos.filter(t => t.id_titulo_padre === null).sort((a, b) => a.orden - b.orden);
      if (titulosRaiz.length > 0) {
        nuevoIdTitulo = titulosRaiz[0].id_titulo;
        const partidasDelTitulo = partidas.filter(p => p.id_titulo === nuevoIdTitulo && p.id_partida_padre === null);
        nuevoOrden = partidasDelTitulo.length > 0
          ? Math.max(...partidasDelTitulo.map(p => p.orden)) + 1
          : 1;
      }
    }

    // Si no hay título disponible, no crear
    if (!nuevoIdTitulo) {
      return;
    }

    // Preparar el modal para crear nueva partida
    setPartidaEditando(null);
    setTituloEditando(null);
    setNombreItem('');
    setTipoItemModal('PARTIDA');
    setModalAbierto(true);

    // Guardar temporalmente los datos de la nueva partida en el estado
    // Usaremos un objeto temporal que se guardará cuando se confirme el nombre
    (window as any).__nuevaPartidaTemp = {
      id_titulo: nuevoIdTitulo,
      nivel_partida: nuevoNivel,
      orden: nuevoOrden,
    };
  }, [itemSeleccionado, titulos, partidas, obtenerTipoItem, obtenerItemsMismoPadre]);

  /**
   * Abre el modal para editar un título existente
   */
  const handleEditarTitulo = useCallback((id_titulo: string) => {
    const titulo = titulos.find(t => t.id_titulo === id_titulo);
    if (titulo) {
      setTituloEditando(titulo);
      setPartidaEditando(null);
      setNombreItem(titulo.descripcion);
      setTipoItemModal('TITULO');
      setModalAbierto(true);
    }
  }, [titulos]);

  /**
   * Abre el modal para editar una partida existente
   */
  const handleEditarPartida = useCallback((id_partida: string) => {
    const partida = partidas.find(p => p.id_partida === id_partida);
    if (partida) {
      setPartidaEditando(partida);
      setTituloEditando(null);
      setNombreItem(partida.descripcion);
      setTipoItemModal('PARTIDA');
      setModalAbierto(true);
    }
  }, [partidas]);

  /**
   * Genera un ID temporal único para nuevos items
   */
  const generarIdTemporal = useCallback((): string => {
    contadorIdTemporal.current += 1;
    return `temp_${Date.now()}_${contadorIdTemporal.current}`;
  }, []);

  /**
   * Guarda el item (título o partida) - solo en estado local, NO en la base de datos
   */
  const handleGuardarItem = useCallback((nombreGuardar: string, partidaData?: { unidad_medida: string; metrado: number; precio_unitario: number; parcial_partida: number }, id_especialidad?: string | null) => {
    // Validar que el nombre no esté vacío
    if (!nombreGuardar || !nombreGuardar.trim()) {
      // Si está editando y el nombre está vacío, no hacer nada y mantener el modal abierto
      if (tituloEditando || partidaEditando) {
        return; // No cerrar el modal, solo retornar
      }
      // Si está creando, no hacer nada
      return;
    }

    if (tipoItemModal === 'TITULO') {
      if (tituloEditando) {
        // Actualizar título existente solo en estado local
        setTitulos(prev => prev.map(t =>
          t.id_titulo === tituloEditando.id_titulo
            ? { ...t, descripcion: nombreGuardar.trim(), id_especialidad: id_especialidad !== undefined ? id_especialidad : t.id_especialidad }
            : t
        ));
      } else {
        // Crear nuevo título solo en estado local
        const tempData = (window as any).__nuevoTituloTemp;
        if (tempData && id_proyecto_real) {
          // Calcular el nivel correcto basándose en el padre
          const nivelCalculado = tempData.id_padre
            ? calcularNivelDinamico(tempData.id_padre) + 1
            : 1;

          // Generar numero_item temporal basado en el orden
          let numeroItemTemporal = tempData.orden.toString().padStart(2, '0');
          if (tempData.id_padre) {
            const tituloPadre = titulos.find(t => t.id_titulo === tempData.id_padre);
            if (tituloPadre && tituloPadre.numero_item) {
              numeroItemTemporal = `${tituloPadre.numero_item}.${numeroItemTemporal}`;
            }
          }

          const nuevoTitulo: Titulo = {
            id_titulo: generarIdTemporal(), // ID temporal
            id_presupuesto: id_presupuesto,
            id_titulo_padre: tempData.id_padre || null,
            nivel: nivelCalculado,
            numero_item: numeroItemTemporal,
            descripcion: nombreGuardar.trim(),
            tipo: nivelCalculado === 1 ? 'TITULO' : 'SUBTITULO',
            orden: tempData.orden,
            total_parcial: 0,
            id_especialidad: id_especialidad || null,
          };

          setTitulos(prev => [...prev, nuevoTitulo]);
          setItemSeleccionado(nuevoTitulo.id_titulo);
          delete (window as any).__nuevoTituloTemp;
        }
      }
    } else {
      // PARTIDA
      if (partidaEditando) {
        // Actualizar partida existente solo en estado local con todos los campos
        setPartidas(prev => prev.map(p => {
          if (p.id_partida === partidaEditando.id_partida) {
            const updated = { ...p, descripcion: nombreGuardar.trim() };
            if (partidaData) {
              updated.unidad_medida = partidaData.unidad_medida || p.unidad_medida;
              updated.metrado = partidaData.metrado ?? p.metrado;
              updated.precio_unitario = partidaData.precio_unitario ?? p.precio_unitario;
              updated.parcial_partida = partidaData.parcial_partida ?? (updated.metrado * updated.precio_unitario);
            }
            return updated;
          }
          return p;
        }));
      } else {
        // Crear nueva partida solo en estado local
        const tempData = (window as any).__nuevaPartidaTemp;
        if (tempData && id_proyecto_real) {
          // Generar numero_item temporal basado en el título y orden
          const tituloPadre = titulos.find(t => t.id_titulo === tempData.id_titulo);
          let numeroItemTemporal = tempData.orden.toString().padStart(2, '0');
          if (tituloPadre && tituloPadre.numero_item) {
            numeroItemTemporal = `${tituloPadre.numero_item}.${numeroItemTemporal}`;
          }

          const nuevaPartida: Partida = {
            id_partida: generarIdTemporal(), // ID temporal
            id_presupuesto: id_presupuesto,
            id_proyecto: id_proyecto_real,
            id_titulo: tempData.id_titulo,
            id_partida_padre: null,
            nivel_partida: tempData.nivel_partida,
            numero_item: numeroItemTemporal,
            descripcion: nombreGuardar.trim(),
            unidad_medida: partidaData?.unidad_medida || 'und',
            metrado: partidaData?.metrado || 0,
            precio_unitario: partidaData?.precio_unitario || 0,
            parcial_partida: partidaData?.parcial_partida || (partidaData ? (partidaData.metrado * partidaData.precio_unitario) : 0),
            orden: tempData.orden,
            estado: 'Activa',
          };

          setPartidas(prev => [...prev, nuevaPartida]);
          setItemSeleccionado(nuevaPartida.id_partida);
          delete (window as any).__nuevaPartidaTemp;
        }
      }
    }

    // Cerrar modal
    setModalAbierto(false);
    setTituloEditando(null);
    setPartidaEditando(null);
    setNombreItem('');
  }, [tituloEditando, partidaEditando, tipoItemModal, id_presupuesto, id_proyecto_real, calcularNivelDinamico, titulos, generarIdTemporal]);

  /**
   * Cierra el modal
   */
  const handleCerrarModal = useCallback(() => {
    setModalAbierto(false);
    setTituloEditando(null);
    setPartidaEditando(null);
    setNombreItem('');
    delete (window as any).__nuevoTituloTemp;
    delete (window as any).__nuevaPartidaTemp;
  }, []);

  /**
   * Pega un bloque cortado en una nueva posición
   */
  const handlePegar = useCallback((idDestino: string) => {
    if (!itemCortado || !idDestino) return;

    const tipoCortado = obtenerTipoItem(itemCortado);
    const tipoDestino = obtenerTipoItem(idDestino);

    if (!tipoCortado || !tipoDestino) return;

    // Validar que no se intente mover un título a ser hijo de sí mismo o de sus descendientes
    if (tipoCortado === 'TITULO') {
      const idsBloque = obtenerIdsBloqueTitulo(itemCortado);
      if (idsBloque.includes(idDestino)) {
        // No se puede mover un título a ser hijo de sí mismo o de sus descendientes
        return;
      }
    }

    // Obtener el nuevo padre basado en el destino
    let nuevoIdPadre: string | null = null;

    if (tipoDestino === 'TITULO') {
      const tituloDestino = titulos.find(t => t.id_titulo === idDestino);
      if (tituloDestino) {
        nuevoIdPadre = tituloDestino.id_titulo;
      }
    } else {
      const partidaDestino = partidas.find(p => p.id_partida === idDestino);
      if (partidaDestino) {
        // Si es una partida, el nuevo padre será el título al que pertenece
        nuevoIdPadre = partidaDestino.id_titulo;
      }
    }

    // Obtener el orden máximo del nuevo padre para colocar al final
    const itemsMismoPadre = obtenerItemsMismoPadre(idDestino);
    const maxOrden = itemsMismoPadre.length > 0
      ? Math.max(...itemsMismoPadre.map(item => item.orden))
      : 0;
    const nuevoOrden = maxOrden + 1;

    // Actualizar el bloque cortado
    if (tipoCortado === 'TITULO') {
      const idsBloque = obtenerIdsBloqueTitulo(itemCortado);

      // Obtener el padre original antes de mover
      const tituloCortado = titulos.find(t => t.id_titulo === itemCortado);
      const idPadreOriginal = tituloCortado?.id_titulo_padre || null;

      // Calcular el nuevo nivel basándose en el nuevo padre
      let nuevoNivel = 1;
      if (nuevoIdPadre) {
        nuevoNivel = calcularNivelDinamico(nuevoIdPadre) + 1;
      }

      setTitulos(prev => {
        const actualizados = prev.map(t => {
          if (t.id_titulo === itemCortado) {
            return { ...t, id_titulo_padre: nuevoIdPadre, orden: nuevoOrden, nivel: nuevoNivel };
          }
          if (idsBloque.includes(t.id_titulo) && t.id_titulo !== itemCortado) {
            // Mantener la jerarquía relativa dentro del bloque
            return t;
          }
          return t;
        });

        // Actualizar niveles de todos los descendientes del título movido recursivamente
        // Usar un Set para evitar bucles infinitos por referencias circulares
        const procesados = new Set<string>();
        const actualizarDescendientes = (id: string, nivelBase: number) => {
          // Protección contra bucles infinitos
          if (procesados.has(id)) {
            return;
          }
          procesados.add(id);

          actualizados.forEach(t => {
            if (t.id_titulo_padre === id) {
              t.nivel = nivelBase + 1;
              actualizarDescendientes(t.id_titulo, nivelBase + 1);
            }
          });
        };
        actualizarDescendientes(itemCortado, nuevoNivel);

        return actualizados;
      });

      // Reordenar los hermanos del padre original y del nuevo padre después de actualizar
      // Usar un pequeño delay para asegurar que el estado se haya actualizado
      setTimeout(() => {
        if (idPadreOriginal !== nuevoIdPadre) {
          if (idPadreOriginal !== null) {
            reordenarItemsPadre(idPadreOriginal);
          }
          if (nuevoIdPadre !== null) {
            reordenarItemsPadre(nuevoIdPadre);
          }
        } else if (nuevoIdPadre !== null) {
          // Si se movió dentro del mismo padre, reordenar
          reordenarItemsPadre(nuevoIdPadre);
        }
      }, 10);
    } else {
      const idsBloque = obtenerIdsBloquePartida(itemCortado);
      setPartidas(prev => prev.map(p => {
        if (p.id_partida === itemCortado) {
          return { ...p, id_titulo: nuevoIdPadre || p.id_titulo, orden: nuevoOrden };
        }
        if (idsBloque.includes(p.id_partida) && p.id_partida !== itemCortado) {
          // Mantener la jerarquía relativa dentro del bloque
          return p;
        }
        return p;
      }));
    }

    setItemCortado(null);
  }, [itemCortado, obtenerTipoItem, obtenerItemsMismoPadre, obtenerIdsBloqueTitulo, obtenerIdsBloquePartida, titulos, partidas]);

  /**
   * Mueve un item (y su bloque completo) hacia arriba
   */
  const handleSubir = useCallback((id: string) => {
    const tipo = obtenerTipoItem(id);
    if (!tipo) return;

    const itemsMismoPadre = obtenerItemsMismoPadre(id);
    const itemActual = itemsMismoPadre.find(item => item.id === id);

    if (!itemActual || itemActual.orden === 1) return; // Ya está en la primera posición

    const ordenNuevo = itemActual.orden - 1;
    const itemAnterior = itemsMismoPadre.find(item => item.orden === ordenNuevo);

    if (!itemAnterior) return;

    // Intercambiar ordenes: el item actual y el anterior
    // Actualizar ambos items en una sola operación para evitar inconsistencias
    if (itemAnterior.tipo === 'TITULO' && tipo === 'TITULO') {
      // Ambos son títulos: intercambiar ordenes
      setTitulos(prev => prev.map(t => {
        if (t.id_titulo === id) {
          return { ...t, orden: ordenNuevo };
        }
        if (t.id_titulo === itemAnterior.id) {
          return { ...t, orden: itemActual.orden };
        }
        return t;
      }));
    } else if (itemAnterior.tipo === 'PARTIDA' && tipo === 'PARTIDA') {
      // Ambos son partidas: intercambiar ordenes
      setPartidas(prev => prev.map(p => {
        if (p.id_partida === id) {
          return { ...p, orden: ordenNuevo };
        }
        if (p.id_partida === itemAnterior.id) {
          return { ...p, orden: itemActual.orden };
        }
        return p;
      }));
    } else {
      // Tipos mixtos: intercambiar ordenes entre título y partida
      if (tipo === 'TITULO') {
        setTitulos(prev => prev.map(t => {
          if (t.id_titulo === id) {
            return { ...t, orden: ordenNuevo };
          }
          return t;
        }));
        setPartidas(prev => prev.map(p => {
          if (p.id_partida === itemAnterior.id) {
            return { ...p, orden: itemActual.orden };
          }
          return p;
        }));
      } else {
        setPartidas(prev => prev.map(p => {
          if (p.id_partida === id) {
            return { ...p, orden: ordenNuevo };
          }
          return p;
        }));
        setTitulos(prev => prev.map(t => {
          if (t.id_titulo === itemAnterior.id) {
            return { ...t, orden: itemActual.orden };
          }
          return t;
        }));
      }
    }
  }, [obtenerTipoItem, obtenerItemsMismoPadre]);

  /**
   * Mueve un item (y su bloque completo) hacia abajo
   */
  const handleBajar = useCallback((id: string) => {
    const tipo = obtenerTipoItem(id);
    if (!tipo) return;

    const itemsMismoPadre = obtenerItemsMismoPadre(id);
    const itemActual = itemsMismoPadre.find(item => item.id === id);

    if (!itemActual) return;

    const maxOrden = Math.max(...itemsMismoPadre.map(item => item.orden));
    if (itemActual.orden === maxOrden) return; // Ya está en la última posición

    const ordenNuevo = itemActual.orden + 1;
    const itemSiguiente = itemsMismoPadre.find(item => item.orden === ordenNuevo);

    if (!itemSiguiente) return;

    // Intercambiar ordenes: el item actual y el siguiente
    // Actualizar ambos items en una sola operación para evitar inconsistencias
    if (itemSiguiente.tipo === 'TITULO' && tipo === 'TITULO') {
      // Ambos son títulos: intercambiar ordenes
      setTitulos(prev => prev.map(t => {
        if (t.id_titulo === id) {
          return { ...t, orden: ordenNuevo };
        }
        if (t.id_titulo === itemSiguiente.id) {
          return { ...t, orden: itemActual.orden };
        }
        return t;
      }));
    } else if (itemSiguiente.tipo === 'PARTIDA' && tipo === 'PARTIDA') {
      // Ambos son partidas: intercambiar ordenes
      setPartidas(prev => prev.map(p => {
        if (p.id_partida === id) {
          return { ...p, orden: ordenNuevo };
        }
        if (p.id_partida === itemSiguiente.id) {
          return { ...p, orden: itemActual.orden };
        }
        return p;
      }));
    } else {
      // Tipos mixtos: intercambiar ordenes entre título y partida
      if (tipo === 'TITULO') {
        setTitulos(prev => prev.map(t => {
          if (t.id_titulo === id) {
            return { ...t, orden: ordenNuevo };
          }
          return t;
        }));
        setPartidas(prev => prev.map(p => {
          if (p.id_partida === itemSiguiente.id) {
            return { ...p, orden: itemActual.orden };
          }
          return p;
        }));
      } else {
        setPartidas(prev => prev.map(p => {
          if (p.id_partida === id) {
            return { ...p, orden: ordenNuevo };
          }
          return p;
        }));
        setTitulos(prev => prev.map(t => {
          if (t.id_titulo === itemSiguiente.id) {
            return { ...t, orden: itemActual.orden };
          }
          return t;
        }));
      }
    }
  }, [obtenerTipoItem, obtenerItemsMismoPadre]);

  /**
   * Verifica si un item puede moverse a la izquierda (subir nivel jerárquico)
   * Un item puede moverse a la izquierda si tiene un padre (no es raíz)
   */
  const puedeMoverIzquierda = useCallback((id: string): boolean => {
    const tipo = obtenerTipoItem(id);
    if (!tipo) return false;

    if (tipo === 'TITULO') {
      const titulo = titulos.find(t => t.id_titulo === id);
      return titulo ? titulo.id_titulo_padre !== null : false;
    } else {
      // Las partidas siempre pertenecen a un título, pero pueden tener id_partida_padre
      const partida = partidas.find(p => p.id_partida === id);
      if (!partida) return false;
      // Una partida puede moverse a la izquierda si tiene un padre de partida
      // o si hay un hermano anterior que pueda ser su padre
      if (partida.id_partida_padre !== null) return true;

      // Si es partida principal, verificar si hay un hermano anterior
      const itemsMismoPadre = obtenerItemsMismoPadre(id);
      const itemActual = itemsMismoPadre.find(item => item.id === id);
      if (!itemActual || itemActual.orden === 1) return false; // No hay hermano anterior

      // Verificar si el hermano anterior es un título (puede ser padre)
      const hermanoAnterior = itemsMismoPadre.find(item => item.orden === itemActual.orden - 1);
      return hermanoAnterior?.tipo === 'TITULO';
    }
  }, [titulos, partidas, obtenerTipoItem, obtenerItemsMismoPadre]);

  /**
   * Verifica si un item puede moverse a la derecha (bajar nivel jerárquico)
   * Un item puede moverse a la derecha si hay un hermano anterior que pueda ser su padre
   */
  const puedeMoverDerecha = useCallback((id: string): boolean => {
    const tipo = obtenerTipoItem(id);
    if (!tipo) return false;

    const itemsMismoPadre = obtenerItemsMismoPadre(id);
    const itemActual = itemsMismoPadre.find(item => item.id === id);

    if (!itemActual || itemActual.orden === 1) return false; // No hay hermano anterior

    // Buscar el hermano anterior
    const hermanoAnterior = itemsMismoPadre.find(item => item.orden === itemActual.orden - 1);

    if (!hermanoAnterior) return false;

    if (tipo === 'TITULO') {
      // Un título puede moverse a la derecha si el hermano anterior es un título
      // (se convierte en hijo de ese título)
      return hermanoAnterior.tipo === 'TITULO';
    } else {
      // Una partida puede moverse a la derecha si el hermano anterior es un título
      // (se convierte en partida de ese título)
      return hermanoAnterior.tipo === 'TITULO';
    }
  }, [obtenerTipoItem, obtenerItemsMismoPadre]);

  /**
   * Mueve un item a la izquierda (sube nivel jerárquico)
   * - Un hijo se convierte en hermano de su padre
   */
  const handleMoverIzquierda = useCallback((id: string) => {
    const tipo = obtenerTipoItem(id);
    if (!tipo || !puedeMoverIzquierda(id)) return;

    if (tipo === 'TITULO') {
      const titulo = titulos.find(t => t.id_titulo === id);
      if (!titulo || !titulo.id_titulo_padre) return;

      // Obtener el padre actual
      const padreActual = titulos.find(t => t.id_titulo === titulo.id_titulo_padre);
      if (!padreActual) return;

      // El nuevo padre será el abuelo (padre del padre actual)
      const nuevoIdPadre = padreActual.id_titulo_padre;

      // Calcular nuevo nivel
      const nuevoNivel = nuevoIdPadre
        ? calcularNivelDinamico(nuevoIdPadre) + 1
        : 1;

      // Obtener el orden máximo de los hermanos del padre actual
      const itemsMismoPadre = obtenerItemsMismoPadre(padreActual.id_titulo);
      const maxOrden = itemsMismoPadre.length > 0
        ? Math.max(...itemsMismoPadre.map(item => item.orden))
        : 0;
      const nuevoOrden = maxOrden + 1;

      // Actualizar el título
      setTitulos(prev => {
        const actualizados = prev.map(t => {
          if (t.id_titulo === id) {
            return { ...t, id_titulo_padre: nuevoIdPadre, nivel: nuevoNivel, orden: nuevoOrden };
          }
          return t;
        });

        // Actualizar niveles de todos los descendientes recursivamente
        const procesados = new Set<string>();
        const actualizarDescendientes = (idTitulo: string, nivelBase: number) => {
          if (procesados.has(idTitulo)) return;
          procesados.add(idTitulo);

          actualizados.forEach(t => {
            if (t.id_titulo_padre === idTitulo) {
              t.nivel = nivelBase + 1;
              actualizarDescendientes(t.id_titulo, nivelBase + 1);
            }
          });
        };
        actualizarDescendientes(id, nuevoNivel);

        return actualizados;
      });

      // Reordenar items del padre original
      setTimeout(() => {
        reordenarItemsPadre(titulo.id_titulo_padre);
        if (nuevoIdPadre !== null) {
          reordenarItemsPadre(nuevoIdPadre);
        }
      }, 10);
    } else {
      // Es una partida
      const partida = partidas.find(p => p.id_partida === id);
      if (!partida) return;

      if (partida.id_partida_padre !== null) {
        // Es una subpartida: convertirla en partida principal
        // El nuevo título será el título de la partida padre
        const partidaPadre = partidas.find(p => p.id_partida === partida.id_partida_padre);
        if (!partidaPadre) return;

        // Obtener el orden máximo de las partidas del título
        const partidasDelTitulo = partidas.filter(
          p => p.id_titulo === partidaPadre.id_titulo && p.id_partida_padre === null
        );
        const maxOrden = partidasDelTitulo.length > 0
          ? Math.max(...partidasDelTitulo.map(p => p.orden))
          : 0;
        const nuevoOrden = maxOrden + 1;

        setPartidas(prev => prev.map(p => {
          if (p.id_partida === id) {
            return {
              ...p,
              id_titulo: partidaPadre.id_titulo,
              id_partida_padre: null,
              nivel_partida: 1,
              orden: nuevoOrden
            };
          }
          return p;
        }));
      } else {
        // Es una partida principal: moverla al título padre del título actual
        const tituloActual = titulos.find(t => t.id_titulo === partida.id_titulo);
        if (!tituloActual || !tituloActual.id_titulo_padre) return;

        // El nuevo título será el abuelo (padre del título actual)
        const tituloAbuelo = titulos.find(t => t.id_titulo === tituloActual.id_titulo_padre);
        if (!tituloAbuelo) return;

        // Obtener el orden máximo de las partidas del título abuelo
        const partidasDelTitulo = partidas.filter(
          p => p.id_titulo === tituloAbuelo.id_titulo && p.id_partida_padre === null
        );
        const maxOrden = partidasDelTitulo.length > 0
          ? Math.max(...partidasDelTitulo.map(p => p.orden))
          : 0;
        const nuevoOrden = maxOrden + 1;

        setPartidas(prev => prev.map(p => {
          if (p.id_partida === id) {
            return { ...p, id_titulo: tituloAbuelo.id_titulo, orden: nuevoOrden };
          }
          return p;
        }));
      }
    }
  }, [titulos, partidas, obtenerTipoItem, puedeMoverIzquierda, calcularNivelDinamico, obtenerItemsMismoPadre, reordenarItemsPadre]);

  /**
   * Mueve un item a la derecha (baja nivel jerárquico)
   * - Un hermano se convierte en hijo del hermano anterior
   */
  const handleMoverDerecha = useCallback((id: string) => {
    const tipo = obtenerTipoItem(id);
    if (!tipo || !puedeMoverDerecha(id)) return;

    const itemsMismoPadre = obtenerItemsMismoPadre(id);
    const itemActual = itemsMismoPadre.find(item => item.id === id);

    if (!itemActual || itemActual.orden === 1) return;

    const hermanoAnterior = itemsMismoPadre.find(item => item.orden === itemActual.orden - 1);
    if (!hermanoAnterior || hermanoAnterior.tipo !== 'TITULO') return;

    if (tipo === 'TITULO') {
      // El título se convierte en hijo del hermano anterior (título)
      const nuevoIdPadre = hermanoAnterior.id;
      const nuevoNivel = calcularNivelDinamico(nuevoIdPadre) + 1;

      // Obtener el orden máximo de los hijos del hermano anterior
      const hijosDelHermano = titulos.filter(t => t.id_titulo_padre === nuevoIdPadre);
      const maxOrden = hijosDelHermano.length > 0
        ? Math.max(...hijosDelHermano.map(t => t.orden))
        : 0;
      const nuevoOrden = maxOrden + 1;

      // Guardar el padre original antes de actualizar
      const tituloActual = titulos.find(t => t.id_titulo === id);
      const idPadreOriginal = tituloActual?.id_titulo_padre || null;

      setTitulos(prev => {
        const actualizados = prev.map(t => {
          if (t.id_titulo === id) {
            return { ...t, id_titulo_padre: nuevoIdPadre, nivel: nuevoNivel, orden: nuevoOrden };
          }
          return t;
        });

        // Actualizar niveles de todos los descendientes recursivamente
        const procesados = new Set<string>();
        const actualizarDescendientes = (idTitulo: string, nivelBase: number) => {
          if (procesados.has(idTitulo)) return;
          procesados.add(idTitulo);

          actualizados.forEach(t => {
            if (t.id_titulo_padre === idTitulo) {
              t.nivel = nivelBase + 1;
              actualizarDescendientes(t.id_titulo, nivelBase + 1);
            }
          });
        };
        actualizarDescendientes(id, nuevoNivel);

        return actualizados;
      });

      // Reordenar items del padre original y del nuevo padre
      setTimeout(() => {
        if (idPadreOriginal !== null && idPadreOriginal !== nuevoIdPadre) {
          reordenarItemsPadre(idPadreOriginal);
        }
        reordenarItemsPadre(nuevoIdPadre);
      }, 10);
    } else {
      // La partida se convierte en partida del título hermano anterior
      const nuevoIdTitulo = hermanoAnterior.id;

      // Guardar el título original antes de actualizar
      const partidaActual = partidas.find(p => p.id_partida === id);
      const idTituloOriginal = partidaActual?.id_titulo || null;

      // Obtener el orden máximo de las partidas del título hermano anterior
      const partidasDelTitulo = partidas.filter(
        p => p.id_titulo === nuevoIdTitulo && p.id_partida_padre === null
      );
      const maxOrden = partidasDelTitulo.length > 0
        ? Math.max(...partidasDelTitulo.map(p => p.orden))
        : 0;
      const nuevoOrden = maxOrden + 1;

      setPartidas(prev => prev.map(p => {
        if (p.id_partida === id) {
          return { ...p, id_titulo: nuevoIdTitulo, orden: nuevoOrden };
        }
        return p;
      }));

      // Reordenar items del título original
      setTimeout(() => {
        if (idTituloOriginal && idTituloOriginal !== nuevoIdTitulo) {
          reordenarItemsPadre(idTituloOriginal);
        }
        reordenarItemsPadre(nuevoIdTitulo);
      }, 10);
    }
  }, [titulos, partidas, obtenerTipoItem, puedeMoverDerecha, calcularNivelDinamico, obtenerItemsMismoPadre, reordenarItemsPadre]);

  /**
   * Elimina un título y todos sus descendientes (solo en estado local)
   */
  const handleEliminarTitulo = useCallback((id_titulo: string) => {
    const titulo = titulos.find(t => t.id_titulo === id_titulo);
    if (!titulo) return;

    // Obtener todos los IDs de títulos descendientes para el mensaje
    const idsDescendientes = obtenerIdsBloqueTitulo(id_titulo);
    const tieneHijos = idsDescendientes.length > 1; // Más de 1 porque incluye el propio título
    const cantidadItems = idsDescendientes.length;

    // Verificar si es un título nuevo (temporal) o existente
    const esNuevo = id_titulo.startsWith('temp_');

    // Confirmar eliminación con modal personalizado
    confirm({
      title: 'Eliminar título',
      message: tieneHijos
        ? `¿Está seguro de eliminar el título "${titulo.descripcion}"?\n\nEsto eliminará también ${cantidadItems - 1} ${cantidadItems - 1 === 1 ? 'título hijo y todas sus partidas asociadas' : 'títulos hijos y todas sus partidas asociadas'}.\n\n${esNuevo ? 'Los cambios se guardarán cuando presione "Guardar cambios".' : 'Esta acción se guardará cuando presione "Guardar cambios".'}`
        : `¿Está seguro de eliminar el título "${titulo.descripcion}"?\n\n${esNuevo ? 'Los cambios se guardarán cuando presione "Guardar cambios".' : 'Esta acción se guardará cuando presione "Guardar cambios".'}`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
      onConfirm: () => {
        if (esNuevo) {
          // Si es nuevo, simplemente eliminarlo del estado local
          setTitulos(prev => prev.filter(t => !idsDescendientes.includes(t.id_titulo)));
          // También eliminar partidas asociadas
          setPartidas(prev => {
            const partidasAEliminar = new Set<string>();
            idsDescendientes.forEach(idTitulo => {
              partidas.filter(p => p.id_titulo === idTitulo).forEach(p => {
                partidasAEliminar.add(p.id_partida);
              });
            });
            return prev.filter(p => !partidasAEliminar.has(p.id_partida));
          });
        } else {
          // Si es existente, marcarlo como eliminado y removerlo del estado local
          setTitulosEliminados(prev => {
            const nuevo = new Set(prev);
            idsDescendientes.forEach(id => nuevo.add(id));
            return nuevo;
          });
          setTitulos(prev => prev.filter(t => !idsDescendientes.includes(t.id_titulo)));
          // También eliminar partidas asociadas
          setPartidas(prev => {
            const partidasAEliminar = new Set<string>();
            idsDescendientes.forEach(idTitulo => {
              partidas.filter(p => p.id_titulo === idTitulo).forEach(p => {
                partidasAEliminar.add(p.id_partida);
                if (!p.id_partida.startsWith('temp_')) {
                  setPartidasEliminadas(prevElim => new Set([...prevElim, p.id_partida]));
                }
              });
            });
            return prev.filter(p => !partidasAEliminar.has(p.id_partida));
          });
        }

        // Limpiar selección si el item eliminado estaba seleccionado
        if (itemSeleccionado === id_titulo || idsDescendientes.includes(itemSeleccionado || '')) {
          setItemSeleccionado(null);
        }

        // Limpiar item cortado si estaba en el bloque eliminado
        if (itemCortado && idsDescendientes.includes(itemCortado)) {
          setItemCortado(null);
        }
      },
    });
  }, [titulos, partidas, itemSeleccionado, itemCortado, obtenerIdsBloqueTitulo, confirm]);

  /**
   * Elimina una partida (solo en estado local)
   */
  const handleEliminarPartida = useCallback((id_partida: string) => {
    const partida = partidas.find(p => p.id_partida === id_partida);
    if (!partida) return;

    // Obtener todos los IDs de partidas descendientes para el mensaje
    const idsDescendientes = obtenerIdsBloquePartida(id_partida);
    const tieneSubpartidas = idsDescendientes.length > 1; // Más de 1 porque incluye la propia partida
    const cantidadItems = idsDescendientes.length;

    // Verificar si es una partida nueva (temporal) o existente
    const esNueva = id_partida.startsWith('temp_');

    // Confirmar eliminación con modal personalizado
    confirm({
      title: 'Eliminar partida',
      message: tieneSubpartidas
        ? `¿Está seguro de eliminar la partida "${partida.descripcion}"?\n\nEsto eliminará también ${cantidadItems - 1} ${cantidadItems - 1 === 1 ? 'subpartida' : 'subpartidas'}.\n\n${esNueva ? 'Los cambios se guardarán cuando presione "Guardar cambios".' : 'Esta acción se guardará cuando presione "Guardar cambios".'}`
        : `¿Está seguro de eliminar la partida "${partida.descripcion}"?\n\n${esNueva ? 'Los cambios se guardarán cuando presione "Guardar cambios".' : 'Esta acción se guardará cuando presione "Guardar cambios".'}`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
      onConfirm: () => {
        if (esNueva) {
          // Si es nueva, simplemente eliminarla del estado local
          setPartidas(prev => prev.filter(p => !idsDescendientes.includes(p.id_partida)));
        } else {
          // Si es existente, marcarla como eliminada y removerla del estado local
          setPartidasEliminadas(prev => {
            const nuevo = new Set(prev);
            idsDescendientes.forEach(id => nuevo.add(id));
            return nuevo;
          });
          setPartidas(prev => prev.filter(p => !idsDescendientes.includes(p.id_partida)));
        }

        // Limpiar selección si el item eliminado estaba seleccionado
        if (itemSeleccionado === id_partida || idsDescendientes.includes(itemSeleccionado || '')) {
          setItemSeleccionado(null);
        }

        // Limpiar item cortado si estaba en el bloque eliminado
        if (itemCortado && idsDescendientes.includes(itemCortado)) {
          setItemCortado(null);
        }
      },
    });
  }, [partidas, itemSeleccionado, itemCortado, obtenerIdsBloquePartida, confirm]);

  /**
   * Detecta si hay cambios pendientes (optimizado)
   */
  const hayCambiosPendientes = useMemo(() => {
    // Verificar si hay items eliminados (más rápido primero)
    if (titulosEliminados.size > 0 || partidasEliminadas.size > 0) {
      return true;
    }

    // Crear Map para búsquedas O(1) en lugar de O(n)
    const titulosOriginalesMap = new Map(titulosOriginales.map(t => [t.id_titulo, t]));
    const partidasOriginalesMap = new Map(partidasOriginales.map(p => [p.id_partida, p]));

    // Verificar títulos en una sola pasada
    for (const titulo of titulos) {
      // Verificar si es nuevo
      if (titulo.id_titulo.startsWith('temp_')) {
        return true;
      }

      // Verificar si está modificado
      const original = titulosOriginalesMap.get(titulo.id_titulo);
      if (original && (
        titulo.descripcion !== original.descripcion ||
        titulo.id_titulo_padre !== original.id_titulo_padre ||
        titulo.orden !== original.orden ||
        titulo.nivel !== original.nivel ||
        titulo.id_especialidad !== original.id_especialidad
      )) {
        return true;
      }
    }

    // Verificar partidas en una sola pasada
    for (const partida of partidas) {
      // Verificar si es nueva
      if (partida.id_partida.startsWith('temp_')) {
        return true;
      }

      // Verificar si está modificada
      const original = partidasOriginalesMap.get(partida.id_partida);
      if (original && (
        partida.descripcion !== original.descripcion ||
        partida.id_titulo !== original.id_titulo ||
        partida.id_partida_padre !== original.id_partida_padre ||
        partida.orden !== original.orden ||
        partida.metrado !== original.metrado ||
        partida.precio_unitario !== original.precio_unitario ||
        partida.unidad_medida !== original.unidad_medida
      )) {
        return true;
      }
    }

    return false;
  }, [titulos, partidas, titulosOriginales, partidasOriginales, titulosEliminados, partidasEliminadas]);

  /**
   * Guarda todos los cambios pendientes usando mutación batch con transacciones
   */
  const handleGuardarCambios = useCallback(async () => {
    if (!hayCambiosPendientes) {
      toast('No hay cambios para guardar', { icon: 'ℹ️' });
      return;
    }

    try {
      setIsSaving(true);
      // Preparar datos para la mutación batch
      const mapeoIdsTitulos: Map<string, string> = new Map(); // temp_id -> real_id (se llenará con la respuesta)

      // 1. Preparar títulos nuevos
      const titulosNuevos = titulos.filter(t => t.id_titulo.startsWith('temp_'));
      const titulosCrear = titulosNuevos.map(titulo => {
        // Calcular numero_item dinámicamente basado en la posición jerárquica actual
        const numeroItemCalculado = calcularNumeroItem(titulo, 'TITULO');
        return {
          id_presupuesto: titulo.id_presupuesto,
          id_proyecto: id_proyecto_real!,
          id_titulo_padre: titulo.id_titulo_padre || undefined,
          nivel: titulo.nivel,
          numero_item: numeroItemCalculado,
          descripcion: titulo.descripcion,
          tipo: titulo.tipo,
          orden: titulo.orden,
          total_parcial: titulo.total_parcial,
          id_especialidad: titulo.id_especialidad || undefined,
          temp_id: titulo.id_titulo, // ID temporal para mapeo
        };
      });

      // 2. Preparar partidas nuevas
      const partidasNuevas = partidas.filter(p => p.id_partida.startsWith('temp_'));
      const partidasCrear = partidasNuevas.map(partida => {
        // Calcular numero_item dinámicamente basado en la posición jerárquica actual
        const numeroItemCalculado = calcularNumeroItem(partida, 'PARTIDA');
        return {
          id_presupuesto: partida.id_presupuesto,
          id_proyecto: id_proyecto_real!,
          id_titulo: partida.id_titulo, // Puede ser temporal, el backend lo manejará
          id_partida_padre: partida.id_partida_padre || undefined,
          nivel_partida: partida.nivel_partida,
          numero_item: numeroItemCalculado,
          descripcion: partida.descripcion,
          unidad_medida: partida.unidad_medida,
          metrado: partida.metrado,
          precio_unitario: partida.precio_unitario,
          parcial_partida: partida.parcial_partida,
          orden: partida.orden,
          estado: partida.estado,
          temp_id: partida.id_partida, // ID temporal para mapeo
        };
      });

      // 3. Preparar títulos a actualizar
      // Si hay elementos eliminados, todos los elementos restantes deben actualizar su numero_item
      const hayEliminaciones = titulosEliminados.size > 0 || partidasEliminadas.size > 0;

      const titulosActualizar = titulos
        .filter(t => !t.id_titulo.startsWith('temp_'))
        .map(titulo => {
          const original = titulosOriginales.find(t => t.id_titulo === titulo.id_titulo);
          if (!original) return null;

          // Calcular numero_item dinámicamente basado en la posición jerárquica actual
          const numeroItemCalculado = calcularNumeroItem(titulo, 'TITULO');

          const cambios: any = { id_titulo: titulo.id_titulo };
          if (titulo.descripcion !== original.descripcion) cambios.descripcion = titulo.descripcion;
          if (titulo.id_titulo_padre !== original.id_titulo_padre) cambios.id_titulo_padre = titulo.id_titulo_padre;
          if (titulo.orden !== original.orden) cambios.orden = titulo.orden;
          if (titulo.nivel !== original.nivel) cambios.nivel = titulo.nivel;
          // Siempre actualizar numero_item con el valor calculado dinámicamente
          // Si hay eliminaciones, forzar actualización incluso si el numero_item no cambió visualmente
          if (numeroItemCalculado !== original.numero_item || hayEliminaciones) {
            cambios.numero_item = numeroItemCalculado;
          }
          if (titulo.tipo !== original.tipo) cambios.tipo = titulo.tipo;
          if (titulo.total_parcial !== original.total_parcial) cambios.total_parcial = titulo.total_parcial;

          // Verificar si hay cambios además del id_titulo
          const tieneCambios = Object.keys(cambios).length > 0;

          // Incluir id_especialidad si cambió o si hay otros cambios (para asegurar que se guarde correctamente en cambios globales)
          if (titulo.id_especialidad !== original.id_especialidad) {
            cambios.id_especialidad = titulo.id_especialidad || null;
          } else if (tieneCambios && titulo.id_especialidad !== undefined) {
            // Si hay otros cambios, incluir id_especialidad también para asegurar que se guarde correctamente
            cambios.id_especialidad = titulo.id_especialidad || null;
          }

          return Object.keys(cambios).length > 1 ? cambios : null; // Solo si hay cambios además del id
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      // 4. Preparar partidas a actualizar
      const partidasActualizar = partidas
        .filter(p => !p.id_partida.startsWith('temp_'))
        .map(partida => {
          const original = partidasOriginales.find(p => p.id_partida === partida.id_partida);
          if (!original) return null;

          // Calcular numero_item dinámicamente basado en la posición jerárquica actual
          const numeroItemCalculado = calcularNumeroItem(partida, 'PARTIDA');

          const cambios: any = { id_partida: partida.id_partida };
          if (partida.descripcion !== original.descripcion) cambios.descripcion = partida.descripcion;
          if (partida.id_titulo !== original.id_titulo) cambios.id_titulo = partida.id_titulo;
          if (partida.id_partida_padre !== original.id_partida_padre) cambios.id_partida_padre = partida.id_partida_padre;
          if (partida.orden !== original.orden) cambios.orden = partida.orden;
          if (partida.metrado !== original.metrado) cambios.metrado = partida.metrado;
          if (partida.precio_unitario !== original.precio_unitario) cambios.precio_unitario = partida.precio_unitario;
          if (partida.unidad_medida !== original.unidad_medida) cambios.unidad_medida = partida.unidad_medida;
          if (partida.nivel_partida !== original.nivel_partida) cambios.nivel_partida = partida.nivel_partida;
          // Siempre actualizar numero_item con el valor calculado dinámicamente
          // Si hay eliminaciones, forzar actualización incluso si el numero_item no cambió visualmente
          if (numeroItemCalculado !== original.numero_item || hayEliminaciones) {
            cambios.numero_item = numeroItemCalculado;
          }
          if (partida.estado !== original.estado) cambios.estado = partida.estado;
          if (partida.parcial_partida !== original.parcial_partida) cambios.parcial_partida = partida.parcial_partida;

          return Object.keys(cambios).length > 1 ? cambios : null; // Solo si hay cambios además del id
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      // 5. Preparar IDs a eliminar
      const titulosEliminar = Array.from(titulosEliminados);
      const partidasEliminar = Array.from(partidasEliminadas);

      // Ejecutar mutación batch con transacción
      const response = await executeMutation<{
        batchEstructuraPresupuesto: {
          success: boolean;
          message?: string;
          titulosCreados: Array<{ id_titulo: string; temp_id?: string }>;
          partidasCreadas: Array<{ id_partida: string; temp_id?: string }>;
          titulosActualizados: Array<{ id_titulo: string }>;
          partidasActualizadas: Array<{ id_partida: string }>;
          titulosEliminados: string[];
          partidasEliminadas: string[];
        };
      }>(BATCH_ESTRUCTURA_PRESUPUESTO_MUTATION, {
        input: {
          titulosCrear,
          partidasCrear,
          titulosActualizar,
          partidasActualizar,
          titulosEliminar,
          partidasEliminar,
        },
      });

      if (!response.batchEstructuraPresupuesto.success) {
        throw new Error(response.batchEstructuraPresupuesto.message || 'Error al guardar los cambios');
      }

      // Crear APUs para subpartidas nuevas que fueron creadas
      if (subpartidasParaCrearApu.size > 0) {
        // Importar las funciones necesarias para crear APUs
        const { useCreateApu } = await import('@/hooks/useAPU');
        const createApu = useCreateApu();

        // Crear un mapa de temp_id -> real_id para las subpartidas
        const tempIdToRealId = new Map<string, string>();
        response.batchEstructuraPresupuesto.partidasCreadas.forEach(p => {
          if (p.temp_id && p.temp_id.startsWith('temp_')) {
            tempIdToRealId.set(p.temp_id, p.id_partida);
          }
        });

        for (const [tempId, subpartida] of subpartidasParaCrearApu) {
          const realId = tempIdToRealId.get(tempId);
          if (!realId || !subpartida.recursos || subpartida.recursos.length === 0) continue;

          const recursosInput: any[] = subpartida.recursos.map((r, index) => ({
            recurso_id: r.recurso_id,
            codigo_recurso: r.codigo_recurso,
            descripcion: r.descripcion,
            unidad_medida: r.unidad_medida,
            tipo_recurso: r.tipo_recurso,
            tipo_recurso_codigo: r.tipo_recurso,
            id_precio_recurso: r.id_precio_recurso,
            precio_usuario: r.precio,
            cuadrilla: r.cuadrilla,
            cantidad: r.cantidad,
            desperdicio_porcentaje: r.desperdicio_porcentaje || 0,
            cantidad_con_desperdicio: r.cantidad * (1 + (r.desperdicio_porcentaje || 0) / 100),
            parcial: r.parcial,
            orden: index,
          }));

          try {
            await createApu.mutateAsync({
              id_partida: realId,
              id_presupuesto: id_proyecto_real!,
              id_proyecto: id_proyecto_real!,
              rendimiento: subpartida.rendimiento || 1.0,
              jornada: subpartida.jornada || 8,
              recursos: recursosInput,
            });
          } catch (error) {
            console.error(`Error creando APU para subpartida ${realId}:`, error);
            // No fallar toda la operación por un error en APU
          }
        }

        // Limpiar el estado de subpartidas para crear APU
        setSubpartidasParaCrearApu(new Map());
      }

      // Invalidar queries para recargar datos
      await queryClient.invalidateQueries({ queryKey: ['estructura-presupuesto', id_presupuesto] });

      // Limpiar estados de eliminados
      setTitulosEliminados(new Set());
      setPartidasEliminadas(new Set());

      toast.success(response.batchEstructuraPresupuesto.message || 'Cambios guardados exitosamente');

      // Los datos se recargarán automáticamente gracias a la invalidación de queries
    } catch (error: any) {
      console.error('Error al guardar cambios:', error);
      toast.error(error?.message || 'Error al guardar los cambios. Se hizo rollback de todas las operaciones.');
    } finally {
      setIsSaving(false);
    }
  }, [
    hayCambiosPendientes,
    titulos,
    partidas,
    titulosOriginales,
    partidasOriginales,
    titulosEliminados,
    partidasEliminadas,
    id_proyecto_real,
    id_presupuesto,
    queryClient,
    calcularNumeroItem,
  ]);

  /**
   * Obtiene el color según el nivel del título (calculado dinámicamente)
   * Todos los títulos del mismo nivel tendrán el mismo color
   */
  const getColorPorNivel = useCallback((id_titulo: string, tipo: string) => {
    // Las partidas siempre tienen el mismo color
    if (tipo === 'PARTIDA') {
      return 'text-[var(--text-primary)]';
    }

    // Calcular el nivel dinámicamente basándose en la jerarquía actual
    const nivel = calcularNivelDinamico(id_titulo);

    // Los títulos se colorean según su nivel
    // Nivel 1: Azul
    // Nivel 2: Naranja
    // Nivel 3: Rojo
    // Nivel 4: Rosa
    // Nivel 5: Cyan
    switch (nivel) {
      case 1:
        return 'text-blue-600 dark:text-blue-400';
      case 2:
        return 'text-orange-500 dark:text-orange-400';
      case 3:
        return 'text-red-600 dark:text-red-400';
      case 4:
        return 'text-pink-500 dark:text-pink-400';
      case 5:
        return 'text-cyan-500 dark:text-cyan-400';
      default:
        return 'text-[var(--text-primary)]';
    }
  }, [calcularNivelDinamico]);


  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  // Obtener nombre del presupuesto de los datos reales
  const nombrePresupuestoReal = estructuraData?.presupuesto?.nombre_presupuesto || nombre_presupuesto;

  // Mostrar loading o error
  if (isLoading) {
    return (
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg border border-[var(--border-color)] p-8">
        <LoadingSpinner size={80} showText={true} text="Cargando estructura del presupuesto..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg border border-[var(--border-color)] p-8">
        <div className="text-center">
          <p className="text-sm text-red-500">Error al cargar la estructura del presupuesto</p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] backdrop-blur-sm rounded-lg border border-[var(--border-color)] card-shadow h-full flex flex-col">
      {/* Header compacto */}
      <div className="flex-shrink-0 px-2 py-1.5 border-b border-[var(--border-color)] flex items-center justify-between gap-2 table-header-shadow">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {(id_proyecto || rutaRetorno) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (rutaRetorno) {
                  router.push(rutaRetorno);
                } else if (id_proyecto) {
                  router.push(`/proyectos/${id_proyecto}`);
                } else {
                  router.back();
                }
              }}
              className="h-6 w-6 p-0 flex-shrink-0"
              title="Volver"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
          )}
          <span className="text-xs text-[var(--text-secondary)] truncate uppercase font-bold">
            {nombrePresupuestoReal}
            {estructuraData?.presupuesto?.total_presupuesto !== undefined && (
              <span className="ml-2 font-semibold text-[var(--text-primary)]">
                Total: S/ {estructuraData.presupuesto.total_presupuesto.toFixed(2)}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón Guardar Cambios */}
          {modo === 'edicion' && (
            <Button
              size="sm"
              variant={hayCambiosPendientes ? "default" : "outline"}
              onClick={handleGuardarCambios}
              disabled={(!hayCambiosPendientes && !isSaving) || isSaving || createTitulo.isPending || updateTitulo.isPending || createPartida.isPending || updatePartida.isPending || deleteTitulo.isPending || deletePartida.isPending}
              className={`flex items-center gap-1.5 h-6 px-2 text-xs ${hayCambiosPendientes ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                }`}
              title={hayCambiosPendientes ? 'Guardar cambios pendientes' : 'No hay cambios para guardar'}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {isSaving ? 'Guardando...' : (hayCambiosPendientes ? 'Guardar cambios' : 'Sin cambios')}
              {hayCambiosPendientes && !isSaving && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </Button>
          )}
          {/* Botones de acción globales */}
          {modo === 'edicion' && (
            <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2 mr-2">
              {itemCortado ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (itemSeleccionado) {
                      handlePegar(itemSeleccionado);
                    }
                  }}
                  disabled={!itemSeleccionado}
                  className="h-6 w-6 p-0"
                  title="Pegar aquí"
                >
                  <Clipboard className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (itemSeleccionado) {
                      handleCortar(itemSeleccionado);
                    }
                  }}
                  disabled={!itemSeleccionado}
                  className="h-6 w-6 p-0"
                  title="Cortar"
                >
                  <Scissors className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (itemSeleccionado) {
                    handleSubir(itemSeleccionado);
                  }
                }}
                disabled={!itemSeleccionado}
                className="h-6 w-6 p-0"
                title="Subir"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (itemSeleccionado) {
                    handleBajar(itemSeleccionado);
                  }
                }}
                disabled={!itemSeleccionado}
                className="h-6 w-6 p-0"
                title="Bajar"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (itemSeleccionado) {
                    handleMoverIzquierda(itemSeleccionado);
                  }
                }}
                disabled={!itemSeleccionado || !puedeMoverIzquierda(itemSeleccionado)}
                className="h-6 w-6 p-0"
                title="Mover a la izquierda (subir nivel)"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (itemSeleccionado) {
                    handleMoverDerecha(itemSeleccionado);
                  }
                }}
                disabled={!itemSeleccionado || !puedeMoverDerecha(itemSeleccionado)}
                className="h-6 w-6 p-0"
                title="Mover a la derecha (bajar nivel)"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (itemSeleccionado) {
                    const tipo = obtenerTipoItem(itemSeleccionado);
                    if (tipo === 'TITULO') {
                      handleEliminarTitulo(itemSeleccionado);
                    } else if (tipo === 'PARTIDA') {
                      handleEliminarPartida(itemSeleccionado);
                    }
                  }
                }}
                disabled={!itemSeleccionado}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          {modo === 'edicion' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCrearTitulo}
                className="flex items-center gap-1 h-6 px-1.5 text-xs"
                title="Crear nuevo título"
              >
                <Plus className="h-3 w-3" />
                Título
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCrearPartida}
                className="flex items-center gap-1 h-6 px-1.5 text-xs"
                title="Crear nueva partida"
              >
                <Plus className="h-3 w-3" />
                Partida
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contenedor Principal - Layout Redimensionable */}
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Panel Superior - Tabla de Estructura */}
        <div
          className="overflow-y-auto overflow-x-auto min-h-0 flex-shrink"
          style={{ height: `${100 - panelInferiorHeight}%` }}
        >
          <div className="py-1">
            <table className="w-full table-fixed divide-y divide-[var(--border-color)] text-xs">
              <thead className="sticky top-0 bg-[var(--card-bg)] z-10 table-header-shadow">
                <tr>
                  <th className="w-[100px] px-2 py-1 text-center font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                    Item
                  </th>
                  <th className="w-auto px-2 py-1 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                    Descripción
                  </th>
                  <th className="w-[90px] px-2 py-1 text-center font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                    Und.
                  </th>
                  <th className="w-[110px] px-2 py-1 text-center font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                    Metrado
                  </th>
                  <th className="w-[130px] px-2 py-1 text-center font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                    P. Unitario
                  </th>
                  <th className="w-[150px] px-2 py-1 text-right font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    <div className="flex flex-col items-end leading-none">
                      <span>Parcial</span>
                      {estructuraData?.presupuesto?.parcial_presupuesto !== undefined && (
                        <span className="text-xs text-purple-800 dark:text-purple-400 font-semibold mt-0">
                          S/{estructuraData.presupuesto.parcial_presupuesto.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--background)] divide-y divide-[var(--border-color)]">
                {estructuraUnificada.map((item) => {
                  if (item.tipo === 'TITULO') {
                    const titulo = item.data;
                    const estaColapsado = titulosColapsados.has(titulo.id_titulo);
                    const tieneHijos = tieneHijosTitulo(titulo.id_titulo);
                    const tienePartidasEnTitulo = tienePartidas(titulo.id_titulo);
                    const partidasDelTitulo = getPartidasDeTitulo(titulo.id_titulo);
                    const esSeleccionado = itemSeleccionado === titulo.id_titulo;
                    const esCortado = itemCortado === titulo.id_titulo;
                    // Un título puede colapsarse si tiene hijos (títulos) O partidas
                    const puedeColapsar = tieneHijos || tienePartidasEnTitulo;

                    // Si algún ancestro está colapsado, no mostrar
                    if (estaOcultoPorColapso(titulo)) {
                      return null;
                    }

                    return (
                      <React.Fragment key={titulo.id_titulo}>
                        {/* Fila de Título */}
                        <tr
                          className={`
                      ${esSeleccionado ? 'bg-blue-500/10' : 'bg-[var(--card-bg)]'}
                      ${esCortado ? 'opacity-50' : ''}
                      ${modo === 'edicion' ? (esSeleccionado ? 'hover:bg-blue-500/15 cursor-pointer' : 'hover:bg-[var(--card-bg)]/80 cursor-pointer') : 'cursor-default'}
                      transition-colors
                    `}
                          onClick={() => handleSeleccionar(titulo.id_titulo)}
                          onDoubleClick={() => modo === 'edicion' && handleEditarTitulo(titulo.id_titulo)}
                        >
                          {/* Item */}
                          <td className={`px-2 py-1 text-right border-r border-[var(--border-color)] whitespace-nowrap ${getColorPorNivel(titulo.id_titulo, titulo.tipo)}`}>
                            <span className="text-xs font-mono">{calcularNumeroItem(titulo, 'TITULO')}</span>
                          </td>

                          {/* Descripción */}
                          <td className="px-2 py-1 border-r border-[var(--border-color)]">
                            <div className="flex items-center gap-1.5">
                              {puedeColapsar && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleColapsoTitulo(titulo.id_titulo);
                                  }}
                                  className="flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  {estaColapsado ? (
                                    <ChevronRight className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                              {!puedeColapsar && <div className="w-3" />}
                              <span
                                className={`font-medium ${getColorPorNivel(titulo.id_titulo, titulo.tipo)}`}
                                style={{ paddingLeft: `${(calcularNivelDinamico(titulo.id_titulo) - 1) * 12}px` }}
                              >
                                {titulo.descripcion}
                              </span>
                            </div>
                          </td>

                          {/* Und. */}
                          <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                            <span className="text-xs text-[var(--text-secondary)]">-</span>
                          </td>

                          {/* Metrado */}
                          <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                            <span className="text-xs text-[var(--text-secondary)]">-</span>
                          </td>

                          {/* Precio */}
                          <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                            <span className="text-xs text-[var(--text-secondary)]">-</span>
                          </td>

                          {/* Parcial */}
                          <td className={`px-2 py-1 text-right whitespace-nowrap ${getColorPorNivel(titulo.id_titulo, titulo.tipo)}`}>
                            <span className="text-xs">S/ {titulo.total_parcial.toFixed(2)}</span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  } else {
                    // Es una partida principal (solo partidas principales, sin subpartidas)
                    const partida = item.data;

                    // Solo mostrar partidas principales (sin id_partida_padre)
                    if (partida.id_partida_padre !== null) {
                      return null; // No mostrar subpartidas aquí
                    }

                    const esSeleccionadaPartida = itemSeleccionado === partida.id_partida;
                    const esCortadaPartida = itemCortado === partida.id_partida;

                    // Si su título padre está colapsado, no mostrar
                    const tituloPadre = titulos.find(t => t.id_titulo === partida.id_titulo);
                    // Si algún ancestro del título padre está colapsado, no mostrar
                    if (estaOcultoPorColapso(partida)) {
                      return null;
                    }

                    return (
                      <tr
                        key={partida.id_partida}
                        className={`
                    ${esSeleccionadaPartida ? 'bg-green-500/10' : 'bg-[var(--background)]'}
                    ${esCortadaPartida ? 'opacity-50' : ''}
                    ${modo === 'edicion' ? (esSeleccionadaPartida ? 'hover:bg-green-500/15 cursor-pointer' : 'hover:bg-[var(--background)]/80 cursor-pointer') : 'cursor-default'}
                    transition-colors
                  `}
                        onClick={() => handleSeleccionar(partida.id_partida)}
                        onDoubleClick={() => modo === 'edicion' && handleEditarPartida(partida.id_partida)}
                      >
                        {/* Item */}
                        <td className="px-2 py-1 text-right border-r border-[var(--border-color)] whitespace-nowrap">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">{calcularNumeroItem(partida, 'PARTIDA')}</span>
                        </td>

                        {/* Descripción */}
                        <td className="px-2 py-1 border-r border-[var(--border-color)]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3" />
                            <span
                              className="text-[var(--text-primary)]"
                              style={{
                                paddingLeft: `${(calcularNivelDinamico(partida.id_titulo) + (partida.nivel_partida - 1)) * 12}px`
                              }}
                            >
                              {partida.descripcion}
                            </span>
                          </div>
                        </td>

                        {/* Und. */}
                        <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                          <span className="text-xs text-[var(--text-secondary)]">{partida.unidad_medida}</span>
                        </td>

                        {/* Metrado */}
                        <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                          <span className="text-xs text-[var(--text-secondary)]">{partida.metrado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>

                        {/* Precio */}
                        <td className="px-2 py-1 text-center border-r border-[var(--border-color)] whitespace-nowrap">
                          <span className="text-xs text-[var(--text-secondary)]">S/ {partida.precio_unitario.toFixed(2)}</span>
                        </td>

                        {/* Parcial */}
                        <td className="px-2 py-1 text-right whitespace-nowrap">
                          <span className="text-xs text-[var(--text-primary)]">S/ {partida.parcial_partida.toFixed(2)}</span>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
            {/* Estado vacío */}
            {estructuraUnificada.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-[var(--text-secondary)]">
                  No hay títulos o partidas aún. Agrega el primero usando el botón "Título".
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Divisor Redimensionable */}
        <div
          className="flex-shrink-0 h-1 bg-[var(--border-color)] hover:bg-blue-500 cursor-row-resize transition-colors relative group table-header-shadow"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-0.5 bg-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity rounded" />
          </div>
        </div>

        {/* Panel Inferior - Detalle de Partida */}
        <div
          className="flex-shrink-0 min-h-0 overflow-hidden"
          style={{ height: `${panelInferiorHeight}%` }}
        >
          <DetallePartidaPanel
            id_partida={partidaSeleccionada}
            id_presupuesto={id_presupuesto}
            id_proyecto={id_proyecto_real}
            partida={partidaSeleccionada ? partidas.find(p => p.id_partida === partidaSeleccionada) || null : null}
            onAgregarSubPartida={() => {
              setSubPartidaParaEditar(null);
              setModalAgregarSubPartidaAbierto(true);
            }}
            onEditarSubPartida={(idPartidaSubpartida, recursos, idPartidaOriginal, rendimiento, jornada, descripcion) => {
              // Guardar TODOS los datos de la subpartida para cargarlos en el modal
              setSubPartidaParaEditar({
                id: idPartidaSubpartida,
                recursos,
                idPartidaOriginal,
                rendimiento,
                jornada,
                descripcion
              });
              setModalAgregarSubPartidaAbierto(true);
            }}
            subpartidasPendientes={subpartidasPendientes}
            onLimpiarSubpartidasPendientes={() => {
              setSubpartidasPendientes([]);
            }}
            subPartidaParaActualizar={subPartidaParaActualizar}
            onLimpiarSubPartidaParaActualizar={() => {
              setSubPartidaParaActualizar(null);
            }}
            onEliminarSubPartida={(idPartidaSubpartida) => {
              // Eliminar la subpartida del estado de partidas
              setPartidas(prev => prev.filter(p => p.id_partida !== idPartidaSubpartida));

              // También eliminarla de las subpartidas para crear APU si existe
              setSubpartidasParaCrearApu(prev => {
                const newMap = new Map(prev);
                newMap.delete(idPartidaSubpartida);
                return newMap;
              });
            }}
            modo={modo as 'edicion' | 'lectura' | 'meta' | 'licitacion' | 'contractual'}
          />
        </div>
      </div>

      {/* Modal para crear/editar título o partida */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title={
          tipoItemModal === 'TITULO'
            ? (tituloEditando ? 'Editar Título' : 'Crear Título')
            : (partidaEditando ? 'Editar Partida' : 'Crear Partida')
        }
        size="sm"
      >
        <CrearPartidasTitulosForm
          nombre={nombreItem}
          onNombreChange={setNombreItem}
          onSave={handleGuardarItem}
          onCancel={handleCerrarModal}
          isEdit={!!(tituloEditando || partidaEditando)}
          tipo={tipoItemModal}
          partidaData={partidaEditando ? {
            unidad_medida: partidaEditando.unidad_medida,
            metrado: partidaEditando.metrado,
            precio_unitario: partidaEditando.precio_unitario,
            parcial_partida: partidaEditando.parcial_partida,
          } : undefined}
          id_especialidad={tituloEditando?.id_especialidad}
        />
      </Modal>

      {/* Modal para agregar subpartida */}
      <ModalAgregarSubPartida
        isOpen={modalAgregarSubPartidaAbierto}
        onClose={() => {
          setModalAgregarSubPartidaAbierto(false);
          setSubPartidaParaEditar(null);
        }}
        partidas={partidas}
        id_presupuesto={id_presupuesto}
        id_proyecto={id_proyecto_real}
        id_partida_padre={itemSeleccionado}
        onAgregarSubPartida={(subPartida) => {
          // Agregar la subpartida como una nueva partida al estado
          setPartidas(prev => {
            const nuevasPartidas = [...prev, {
              ...subPartida,
              // Asegurar que tenga todos los campos necesarios de Partida
              id_presupuesto: subPartida.id_presupuesto,
              id_proyecto: subPartida.id_proyecto,
              id_titulo: subPartida.id_titulo,
              id_partida_padre: subPartida.id_partida_padre,
              nivel_partida: subPartida.nivel_partida,
              numero_item: subPartida.numero_item,
              descripcion: subPartida.descripcion,
              unidad_medida: subPartida.unidad_medida,
              metrado: subPartida.metrado,
              precio_unitario: subPartida.precio_unitario,
              parcial_partida: subPartida.parcial_partida,
              orden: subPartida.orden,
              estado: subPartida.estado,
            }];

            // NO actualizar el precio_unitario aquí - el backend lo calculará basándose en el APU
            return nuevasPartidas;
          });

          // Guardar la subpartida para crear su APU después
          setSubpartidasParaCrearApu(prev => new Map(prev).set(subPartida.id_partida, subPartida));

          // Agregar la subpartida a la lista de pendientes para que el panel la procese
          setSubpartidasPendientes(prev => [...prev, subPartida]);

          setModalAgregarSubPartidaAbierto(false);
          setSubPartidaParaEditar(null);
        }}
        subPartidaParaEditar={subPartidaParaEditar}
        onActualizarSubPartida={(idSubPartida, subPartida) => {
          // Calcular el precio_unitario basado en los parciales de los recursos
          const costoDirectoSubpartida = (subPartida.recursos || []).reduce((suma, recurso) => suma + (recurso.parcial || 0), 0);
          const nuevoPrecioUnitario = Math.round(costoDirectoSubpartida * 100) / 100;

          // Actualizar la subpartida existente en el estado del padre
          setPartidas(prev => prev.map(p =>
            p.id_partida === idSubPartida
              ? {
                ...p,
                descripcion: subPartida.descripcion,
                unidad_medida: subPartida.unidad_medida,
                precio_unitario: nuevoPrecioUnitario, // Usar el recalculado
                parcial_partida: subPartida.parcial_partida,
              }
              : p
          ));

          // Establecer la subpartida para actualizar en el panel de detalle
          setSubPartidaParaActualizar(subPartida);

          setModalAgregarSubPartidaAbierto(false);
          setSubPartidaParaEditar(null);
        }}
        modo={modo as 'edicion' | 'lectura' | 'meta' | 'licitacion' | 'contractual'}
      />
    </div>
  );
}


