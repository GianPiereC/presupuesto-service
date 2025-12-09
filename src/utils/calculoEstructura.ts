/**
 * Utilidades para calcular precio_unitario, parcial_partida y total_parcial
 * Reutiliza la misma lógica que DetallePartidaPanel y RecalculoTotalesService
 */

export interface RecursoAPUCalculo {
  id_recurso_apu: string;
  recurso_id?: string;
  id_partida_subpartida?: string;
  tipo_recurso: string;
  unidad_medida?: string;
  cantidad: number;
  precio: number; // Precio calculado por el backend (puede venir normalizado o no)
  precio_override?: number;
  tiene_precio_override?: boolean;
  id_precio_recurso?: string; // Para buscar precio compartido
  parcial?: number; // Parcial guardado (para calcular precio si no hay compartido)
  cuadrilla?: number;
  desperdicio_porcentaje?: number;
  precio_unitario_subpartida?: number;
}

export interface APUCalculo {
  id_apu: string;
  id_partida: string;
  rendimiento: number;
  jornada: number;
  recursos: RecursoAPUCalculo[];
}

export interface PartidaCalculo {
  id_partida: string;
  id_titulo: string;
  id_partida_padre: string | null;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
}

export interface TituloCalculo {
  id_titulo: string;
  id_titulo_padre: string | null;
  total_parcial: number;
}

/**
 * Redondea a 2 decimales (misma lógica que DetallePartidaPanel)
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Calcula el precio de un recurso usando la misma lógica de prioridades que el backend
 * PRIORIDAD 1: precio_override (si tiene_precio_override = true)
 * PRIORIDAD 2: precio compartido (si tiene id_precio_recurso)
 * PRIORIDAD 3: calcular desde parcial guardado
 * PRIORIDAD 4: usar precio que viene del backend
 */
function calcularPrecioRecurso(
  recurso: RecursoAPUCalculo,
  preciosCompartidosMap: Map<string, number>,
  rendimiento: number,
  jornada: number
): number {
  // PRIORIDAD 1: Si tiene precio override, usarlo directamente
  if (recurso.tiene_precio_override && recurso.precio_override !== undefined && recurso.precio_override !== null) {
    return recurso.precio_override;
  }
  
  // PRIORIDAD 2: Si no tiene override, usar precio compartido
  if (recurso.id_precio_recurso && preciosCompartidosMap.has(recurso.id_precio_recurso)) {
    return preciosCompartidosMap.get(recurso.id_precio_recurso)!;
  }
  
  // PRIORIDAD 3: Si no hay precio compartido, intentar calcular desde parcial guardado
  if (recurso.parcial !== undefined && recurso.parcial !== null) {
    const tipoRecurso = recurso.tipo_recurso || 'MATERIAL';
    const cantidad = recurso.cantidad || 0;
    const desperdicio = recurso.desperdicio_porcentaje || 0;
    const cantidadConDesperdicio = cantidad * (1 + desperdicio / 100);
    
    if (tipoRecurso === 'MANO_OBRA' && rendimiento > 0 && jornada > 0) {
      // Despejar precio desde parcial: Precio = Parcial / ((1 / Rendimiento) × Jornada × Cuadrilla)
      const cuadrillaValue = recurso.cuadrilla || 1;
      const divisor = (1 / rendimiento) * jornada * cuadrillaValue;
      if (divisor > 0) {
        return recurso.parcial / divisor;
      }
    } else if (cantidadConDesperdicio > 0) {
      return recurso.parcial / cantidadConDesperdicio;
    }
  }
  
  // PRIORIDAD 4: Usar precio que viene del backend (ya normalizado)
  return recurso.precio || 0;
}

/**
 * Calcula la suma de parciales de Mano de Obra (para EQUIPO con %mo)
 * Misma lógica que DetallePartidaPanel.calcularSumaParcialesManoObra
 */
function calcularSumaParcialesManoObra(
  recursos: RecursoAPUCalculo[],
  rendimiento: number,
  jornada: number,
  preciosCompartidosMap: Map<string, number>
): number {
  return recursos
    .filter(r => r.tipo_recurso === 'MANO_OBRA' && r.unidad_medida?.toLowerCase() === 'hh')
    .reduce((suma, r) => {
      if (!rendimiento || rendimiento <= 0) return suma;
      if (!jornada || jornada <= 0) return suma;
      
      const precio = calcularPrecioRecurso(r, preciosCompartidosMap, rendimiento, jornada);
      const cuadrilla = r.cuadrilla || 1;
      const parcialMO = (1 / rendimiento) * jornada * cuadrilla * precio;
      return suma + parcialMO;
    }, 0);
}

/**
 * Calcula el parcial de un recurso individual
 * Misma lógica que DetallePartidaPanel.calcularParcial
 */
export function calcularParcialRecurso(
  recurso: RecursoAPUCalculo,
  rendimiento: number,
  jornada: number,
  preciosCompartidosMap: Map<string, number>,
  sumaHHManoObra?: number,
  mapaAPUs?: Map<string, APUCalculo>
): number {
  // Si es una subpartida, calcular dinámicamente el precio_unitario_subpartida
  if (recurso.id_partida_subpartida) {
    // Si ya viene calculado desde el backend, usarlo
    if (recurso.precio_unitario_subpartida !== undefined && recurso.precio_unitario_subpartida !== null) {
      return roundToTwo(recurso.cantidad * recurso.precio_unitario_subpartida);
    }
    
    // Si no viene calculado, calcularlo dinámicamente desde el APU de la subpartida
    if (mapaAPUs && recurso.id_partida_subpartida) {
      const apuSubpartida = mapaAPUs.get(recurso.id_partida_subpartida);
      if (apuSubpartida) {
        // Calcular costo_directo de la subpartida (suma de parciales de sus recursos)
        // Pasar mapaAPUs para permitir subpartidas anidadas recursivamente
        const costoDirectoSubpartida = calcularCostoDirectoAPU(apuSubpartida, preciosCompartidosMap, mapaAPUs);
        // El precio_unitario_subpartida es el costo_directo
        const precioUnitarioSubpartida = costoDirectoSubpartida;
        // El parcial del recurso que es subpartida = cantidad × precio_unitario_subpartida
        return roundToTwo(recurso.cantidad * precioUnitarioSubpartida);
      }
    }
    
    // Si no se encuentra el APU de la subpartida, retornar 0
    return 0;
  }

  // Calcular precio usando lógica de prioridades
  const precio = calcularPrecioRecurso(recurso, preciosCompartidosMap, rendimiento, jornada);

  switch (recurso.tipo_recurso) {
    case 'MATERIAL': {
      const cantidadConDesperdicio = recurso.cantidad * 
        (1 + (recurso.desperdicio_porcentaje || 0) / 100);
      return roundToTwo(cantidadConDesperdicio * precio);
    }

    case 'MANO_OBRA': {
      if (!rendimiento || rendimiento <= 0) return 0;
      if (!jornada || jornada <= 0) return 0;
      const cuadrillaValue = recurso.cuadrilla || 1;
      return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
    }

    case 'EQUIPO': {
      // Si la unidad es "%mo", calcular basándose en la sumatoria de HH de MO
      if (recurso.unidad_medida === '%mo' || recurso.unidad_medida?.toLowerCase() === '%mo') {
        if (sumaHHManoObra === undefined) return 0;
        return roundToTwo(sumaHHManoObra * (recurso.cantidad / 100));
      }

      // Si la unidad es "hm" (horas hombre), usar cálculo con cuadrilla
      if (recurso.unidad_medida === 'hm' || recurso.unidad_medida?.toLowerCase() === 'hm') {
        if (!rendimiento || rendimiento <= 0) return 0;
        if (!jornada || jornada <= 0) return 0;
        const cuadrillaValue = recurso.cuadrilla || 1;
        return roundToTwo((1 / rendimiento) * jornada * cuadrillaValue * precio);
      }

      // Para otras unidades: cálculo simple cantidad × precio
      return roundToTwo(recurso.cantidad * precio);
    }

    case 'SUBCONTRATO':
      return roundToTwo(recurso.cantidad * precio);

    default:
      return roundToTwo(recurso.cantidad * precio);
  }
}

/**
 * Calcula el costo_directo de un APU (suma de todos los parciales)
 * Misma lógica que DetallePartidaPanel (suma de parciales de recursos)
 */
export function calcularCostoDirectoAPU(
  apu: APUCalculo,
  preciosCompartidosMap: Map<string, number>,
  mapaAPUs?: Map<string, APUCalculo>
): number {
  // Primero calcular suma de HH de MO (para EQUIPO con %mo)
  const sumaHH = calcularSumaParcialesManoObra(
    apu.recursos,
    apu.rendimiento,
    apu.jornada,
    preciosCompartidosMap
  );

  // Calcular parcial de cada recurso (pasar mapaAPUs para calcular subpartidas recursivamente)
  const parciales = apu.recursos.map(r => 
    calcularParcialRecurso(r, apu.rendimiento, apu.jornada, preciosCompartidosMap, sumaHH, mapaAPUs)
  );

  // Sumar todos los parciales
  return roundToTwo(parciales.reduce((suma, p) => suma + p, 0));
}

/**
 * Mapeo para acceso rápido: id_partida -> APU
 */
export function crearMapaAPUsPorPartida(apus: APUCalculo[]): Map<string, APUCalculo> {
  const mapa = new Map<string, APUCalculo>();
  apus.forEach(apu => {
    mapa.set(apu.id_partida, apu);
  });
  return mapa;
}

/**
 * Calcula precio_unitario y parcial_partida para todas las partidas
 * precio_unitario = costo_directo del APU
 * parcial_partida = metrado × precio_unitario
 */
export function calcularPartidas(
  partidas: Array<{ id_partida: string; id_titulo: string; id_partida_padre: string | null; metrado: number }>,
  mapaAPUs: Map<string, APUCalculo>,
  preciosCompartidosMap: Map<string, number>
): PartidaCalculo[] {
  return partidas.map(partida => {
    const apu = mapaAPUs.get(partida.id_partida);
    
    if (apu) {
      // Calcular costo_directo del APU (pasar mapaAPUs para calcular subpartidas recursivamente)
      const costo_directo = calcularCostoDirectoAPU(apu, preciosCompartidosMap, mapaAPUs);
      
      // precio_unitario = costo_directo
      const precio_unitario = costo_directo;
      
      // parcial_partida = metrado × precio_unitario
      const parcial_partida = roundToTwo((partida.metrado || 0) * precio_unitario);
      
      return {
        id_partida: partida.id_partida,
        id_titulo: partida.id_titulo,
        id_partida_padre: partida.id_partida_padre,
        metrado: partida.metrado,
        precio_unitario,
        parcial_partida
      };
    }
    
    // Si no tiene APU, valores por defecto
    return {
      id_partida: partida.id_partida,
      id_titulo: partida.id_titulo,
      id_partida_padre: partida.id_partida_padre,
      metrado: partida.metrado,
      precio_unitario: 0,
      parcial_partida: 0
    };
  });
}

/**
 * Crea mapas de referencia para acceso rápido O(1)
 */
export function crearMapasReferencia(
  titulos: Array<{ id_titulo: string; id_titulo_padre: string | null }>,
  partidas: PartidaCalculo[]
) {
  // Mapa: id_titulo -> partidas directas (sin padre)
  const partidasPorTitulo = new Map<string, PartidaCalculo[]>();
  partidas.forEach(partida => {
    // Solo partidas principales (sin padre) contribuyen al total del título
    if (!partida.id_partida_padre) {
      if (!partidasPorTitulo.has(partida.id_titulo)) {
        partidasPorTitulo.set(partida.id_titulo, []);
      }
      partidasPorTitulo.get(partida.id_titulo)!.push(partida);
    }
  });

  // Mapa: id_titulo -> títulos hijos
  const titulosHijos = new Map<string, Array<{ id_titulo: string; total_parcial: number }>>();
  titulos.forEach(titulo => {
    if (titulo.id_titulo_padre) {
      if (!titulosHijos.has(titulo.id_titulo_padre)) {
        titulosHijos.set(titulo.id_titulo_padre, []);
      }
      titulosHijos.get(titulo.id_titulo_padre)!.push({
        id_titulo: titulo.id_titulo,
        total_parcial: 0 // Se calculará después
      });
    }
  });

  // Mapa: id_titulo -> título padre (para navegación ascendente)
  const tituloPadre = new Map<string, string | null>();
  titulos.forEach(titulo => {
    tituloPadre.set(titulo.id_titulo, titulo.id_titulo_padre);
  });

  return {
    partidasPorTitulo,
    titulosHijos,
    tituloPadre
  };
}

/**
 * Calcula total_parcial de un título
 * Suma: parciales de partidas directas + totales de títulos hijos
 * Misma lógica que RecalculoTotalesService.calcularTotalTitulo
 */
function calcularTotalTitulo(
  id_titulo: string,
  partidasPorTitulo: Map<string, PartidaCalculo[]>,
  titulosHijos: Map<string, Array<{ id_titulo: string; total_parcial: number }>>,
  totalesCalculados: Map<string, number>
): number {
  // Suma de parciales de partidas directas (sin padre)
  const partidasDirectas = partidasPorTitulo.get(id_titulo) || [];
  const sumaPartidas = partidasDirectas.reduce((suma, p) => suma + p.parcial_partida, 0);
  
  // Suma de totales de títulos hijos
  const hijos = titulosHijos.get(id_titulo) || [];
  const sumaHijos = hijos.reduce((suma, hijo) => {
    const totalHijo = totalesCalculados.get(hijo.id_titulo) || 0;
    return suma + totalHijo;
  }, 0);
  
  // Redondear a 2 decimales
  return roundToTwo(sumaPartidas + sumaHijos);
}

/**
 * Propaga totales de forma ascendente (desde hojas hacia raíz)
 * Misma lógica que RecalculoTotalesService.recalcularTotalesAscendentesRecursivo
 */
export function propagarTotalesTitulos(
  titulos: Array<{ id_titulo: string; id_titulo_padre: string | null }>,
  partidas: PartidaCalculo[]
): Map<string, number> {
  const { partidasPorTitulo, titulosHijos, tituloPadre } = crearMapasReferencia(titulos, partidas);
  
  // Mapa para almacenar totales calculados
  const totalesCalculados = new Map<string, number>();
  
  // Función recursiva para calcular total de un título y propagar hacia arriba
  const calcularYPropagar = (id_titulo: string, visitados: Set<string> = new Set()): number => {
    // Protección contra ciclos
    if (visitados.has(id_titulo)) {
      console.warn(`Ciclo detectado en jerarquía de títulos: ${id_titulo}`);
      return 0;
    }
    
    visitados.add(id_titulo);
    
    // Si ya fue calculado, retornar
    if (totalesCalculados.has(id_titulo)) {
      visitados.delete(id_titulo);
      return totalesCalculados.get(id_titulo)!;
    }
    
    // Calcular total del título
    const total = calcularTotalTitulo(id_titulo, partidasPorTitulo, titulosHijos, totalesCalculados);
    totalesCalculados.set(id_titulo, total);
    
    // Si tiene padre, propagar hacia arriba
    const padre = tituloPadre.get(id_titulo);
    if (padre) {
      calcularYPropagar(padre, visitados);
    }
    
    visitados.delete(id_titulo);
    return total;
  };
  
  // Calcular totales empezando desde las hojas (títulos sin hijos)
  const titulosSinHijos = titulos.filter(t => {
    const hijos = titulosHijos.get(t.id_titulo) || [];
    return hijos.length === 0;
  });
  
  // Calcular desde cada hoja
  titulosSinHijos.forEach(titulo => {
    calcularYPropagar(titulo.id_titulo);
  });
  
  // Asegurar que todos los títulos tengan total calculado
  titulos.forEach(titulo => {
    if (!totalesCalculados.has(titulo.id_titulo)) {
      calcularYPropagar(titulo.id_titulo);
    }
  });
  
  return totalesCalculados;
}

/**
 * Calcula el parcial_presupuesto sumando todos los títulos raíz (sin padre)
 * Misma lógica que RecalculoTotalesService.actualizarParcialPresupuesto
 */
export function calcularParcialPresupuesto(
  titulos: Array<{ id_titulo: string; id_titulo_padre: string | null }>,
  totalesTitulos: Map<string, number>
): number {
  const titulosRaiz = titulos.filter(t => !t.id_titulo_padre);
  const suma = titulosRaiz.reduce((suma, titulo) => {
    return suma + (totalesTitulos.get(titulo.id_titulo) || 0);
  }, 0);
  
  return roundToTwo(suma);
}

