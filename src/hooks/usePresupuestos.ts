import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, executeMutation } from '@/services/graphql-client';
import { GET_PRESUPUESTOS_BY_PROYECTO_QUERY, GET_PRESUPUESTO_QUERY, GET_ESTRUCTURA_PRESUPUESTO_QUERY, GET_PRESUPUESTOS_POR_FASE_QUERY } from '@/graphql/queries/presupuesto.queries';
import { ADD_PRESUPUESTO_MUTATION, UPDATE_PRESUPUESTO_MUTATION, DELETE_PRESUPUESTO_MUTATION, CREAR_PRESUPUESTO_PADRE_MUTATION, CREAR_VERSION_DESDE_PADRE_MUTATION, CREAR_VERSION_DESDE_VERSION_MUTATION, ENVIAR_A_LICITACION_MUTATION, PASAR_A_CONTRACTUAL_MUTATION, CREAR_PRESUPUESTO_META_DESDE_CONTRACTUAL_MUTATION, ACTUALIZAR_PRESUPUESTO_PADRE_MUTATION, ELIMINAR_GRUPO_PRESUPUESTO_COMPLETO_MUTATION, ENVIAR_VERSION_META_A_APROBACION_MUTATION, ENVIAR_VERSION_META_A_OFICIALIZACION_MUTATION } from '@/graphql/mutations/presupuesto.mutations';
import { useAuth } from '@/context/auth-context';
import toast from 'react-hot-toast';
import { showCloningToast, dismissCloningToast } from '@/utils/cloning-toast';
import type { APUCalculo } from '@/utils/calculoEstructura';
import {
  calcularCostoDirectoAPU,
  crearMapaAPUsPorPartida,
  calcularPartidas,
  propagarTotalesTitulos,
  calcularParcialPresupuesto
} from '@/utils/calculoEstructura';

export interface Presupuesto {
  _id?: string;
  id_presupuesto: string;
  id_proyecto: string;
  nombre_presupuesto: string;
  costo_directo: number;
  monto_igv: number;
  monto_utilidad: number;
  parcial_presupuesto: number;
  total_presupuesto: number;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  fecha_creacion: string;
  observaciones: string;
  numeracion_presupuesto?: number;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
  version?: number | null;
  descripcion_version?: string;
  es_padre?: boolean;
  id_grupo_version?: string;
  id_presupuesto_base?: string;
  id_presupuesto_licitacion?: string;
  version_licitacion_aprobada?: number;
  estado?: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'vigente';
  estado_aprobacion?: {
    tipo: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META' | null;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
    id_aprobacion?: string;
  };
  es_inmutable?: boolean;
  es_activo?: boolean;
}

/**
 * Normaliza presupuestos antiguos (sin campos nuevos) como versión 1
 */
export function normalizarPresupuesto(p: Presupuesto): Presupuesto {
  // Si es presupuesto antiguo (sin id_grupo_version y sin version)
  // Incluye el caso donde es_padre: true pero id_grupo_version: null (datos antiguos)
  if (!p.id_grupo_version && (p.version === null || p.version === undefined)) {
    return {
      ...p,
      // Asignar valores por defecto para compatibilidad
      id_grupo_version: p.id_presupuesto, // Usar su propio ID como grupo
      version: 1,                          // Tratar como versión 1
      es_padre: false,                    // No es padre, es versión (para mostrar)
      fase: (p.fase || 'BORRADOR') as 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META',          // Default a BORRADOR si no tiene fase
    };
  }
  
  // Si es un padre nuevo (tiene id_grupo_version pero version es null)
  // No normalizar, dejarlo como está (no se muestra en la lista de versiones)
  if (p.es_padre === true && p.id_grupo_version && p.version === null) {
    return p; // Dejar el padre como está, no se muestra
  }
  
  // Si ya tiene campos nuevos, usar tal cual
  return p;
}

/**
 * Hook para obtener presupuestos por proyecto
 */
export function usePresupuestosByProyecto(id_proyecto: string | null) {
  return useQuery({
    queryKey: ['presupuestos', 'proyecto', id_proyecto],
    queryFn: async () => {
      if (!id_proyecto) return [];
      const response = await executeQuery<{ getPresupuestosByProyecto: Presupuesto[] }>(
        GET_PRESUPUESTOS_BY_PROYECTO_QUERY,
        { id_proyecto }
      );
      // Normalizar presupuestos antiguos
      // NOTA: Incluimos padres para poder detectar versiones ganadoras/cerradas en la vista de proyectos
      const presupuestosNormalizados = response.getPresupuestosByProyecto.map(normalizarPresupuesto);
      return presupuestosNormalizados;
    },
    enabled: !!id_proyecto,
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener presupuestos por fase
 * Retorna tanto padres como versiones para poder agrupar
 */
export function usePresupuestosPorFase(
  fase: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META',
  id_proyecto?: string | null
) {
  return useQuery({
    queryKey: ['presupuestos', 'fase', fase, id_proyecto],
    queryFn: async () => {
      const response = await executeQuery<{ getPresupuestosPorFaseYEstado: Presupuesto[] }>(
        GET_PRESUPUESTOS_POR_FASE_QUERY,
        {
          fase,
          estado: null,
          id_proyecto: id_proyecto || null,
        }
      );
      // Normalizar todos los presupuestos (padres y versiones)
      const presupuestosNormalizados = response.getPresupuestosPorFaseYEstado.map(normalizarPresupuesto);
      return presupuestosNormalizados;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener un presupuesto por ID
 */
export function usePresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return null;
      const response = await executeQuery<{ getPresupuesto: Presupuesto | null }>(
        GET_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      return response.getPresupuesto;
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

// Tipos para la estructura del presupuesto
export interface TituloEstructura {
  _id?: string;
  id_titulo: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: 'TITULO' | 'SUBTITULO';
  orden: number;
  total_parcial: number;
}

export interface PartidaEstructura {
  _id?: string;
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

// Tipos para APUs en la estructura
export interface RecursoAPUEstructura {
  id_recurso_apu: string;
  recurso_id?: string;
  id_partida_subpartida?: string;
  codigo_recurso?: string;
  descripcion: string;
  unidad_medida?: string;
  tipo_recurso: string;
  id_precio_recurso?: string;
  precio: number;
  precio_override?: number;
  tiene_precio_override?: boolean;
  cantidad: number;
  cuadrilla?: number;
  desperdicio_porcentaje?: number;
  cantidad_con_desperdicio?: number;
  parcial?: number;
  precio_unitario_subpartida?: number;
  orden: number;
}

export interface APUEstructura {
  _id?: string;
  id_apu: string;
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  rendimiento: number;
  jornada: number;
  recursos: RecursoAPUEstructura[];
}

export interface PrecioCompartidoEstructura {
  id_precio_recurso: string;
  recurso_id: string;
  precio: number;
}

export interface EstructuraPresupuesto {
  presupuesto: Presupuesto;
  titulos: TituloEstructura[];
  partidas: PartidaEstructura[];
  apus?: APUEstructura[]; // NUEVO: APUs completos para cálculos en frontend
  precios_compartidos?: PrecioCompartidoEstructura[]; // NUEVO: Precios compartidos para cálculos en frontend
}

/**
 * Hook para obtener la estructura completa del presupuesto (títulos y partidas)
 * AHORA CALCULA precio_unitario, parcial_partida y total_parcial en frontend
 */
export function useEstructuraPresupuesto(id_presupuesto: string | null) {
  return useQuery({
    queryKey: ['estructura-presupuesto', id_presupuesto],
    queryFn: async () => {
      if (!id_presupuesto) return null;
      
      const tiempoQueryInicio = performance.now();
      const response = await executeQuery<{ getEstructuraPresupuesto: EstructuraPresupuesto | null }>(
        GET_ESTRUCTURA_PRESUPUESTO_QUERY,
        { id_presupuesto }
      );
      const tiempoQueryTotal = performance.now() - tiempoQueryInicio;
      console.log(`[HOOK] ⏱️ Query GraphQL: ${tiempoQueryTotal.toFixed(2)}ms`);
      
      const estructura = response.getEstructuraPresupuesto;
      if (!estructura) return null;

      const tiempoCalculoInicio = performance.now();
      
      // Analizar partidas para identificar subpartidas
      const partidasConPadre = estructura.partidas.filter(p => p.id_partida_padre !== null);
      const partidasRaiz = estructura.partidas.filter(p => p.id_partida_padre === null);
      
      // Analizar recursos de APUs para identificar subpartidas
      let recursosConSubpartida = 0;
      estructura.apus?.forEach(apu => {
        apu.recursos?.forEach(recurso => {
          if (recurso.id_partida_subpartida) {
            recursosConSubpartida++;
          }
        });
      });
      
      console.log(`[HOOK] 📊 Datos recibidos:`, {
        titulos: estructura.titulos?.length || 0,
        partidas: estructura.partidas?.length || 0,
        partidasRaiz: partidasRaiz.length,
        partidasConPadre: partidasConPadre.length,
        apus: estructura.apus?.length || 0,
        recursosConSubpartida,
        preciosCompartidos: estructura.precios_compartidos?.length || 0,
      });
      
      // Log detallado de subpartidas encontradas
      if (partidasConPadre.length > 0) {
        console.log(`[HOOK] 🔍 Subpartidas encontradas en partidas:`, partidasConPadre.map(p => ({
          id_partida: p.id_partida,
          id_partida_padre: p.id_partida_padre,
          descripcion: p.descripcion,
          nivel_partida: p.nivel_partida,
        })));
      }
      
      // Log detallado de recursos que son subpartidas
      if (recursosConSubpartida > 0) {
        console.log(`[HOOK] 🔍 Recursos que son subpartidas encontrados: ${recursosConSubpartida}`);
        estructura.apus?.forEach(apu => {
          apu.recursos?.forEach(recurso => {
            if (recurso.id_partida_subpartida) {
              console.log(`[HOOK]   - Recurso subpartida en APU ${apu.id_apu}:`, {
                id_recurso_apu: recurso.id_recurso_apu,
                id_partida_subpartida: recurso.id_partida_subpartida,
                descripcion: recurso.descripcion,
                precio_unitario_subpartida: recurso.precio_unitario_subpartida,
              });
            }
          });
        });
      }

      // Variables para almacenar resultados calculados
      let partidasCompletas: PartidaEstructura[];
      let titulosCalculados: TituloEstructura[];
      let parcialPresupuesto: number;

      // Si no hay APUs, calcular con valores en 0
      if (!estructura.apus || estructura.apus.length === 0) {
        const tiempoSinApusInicio = performance.now();
        partidasCompletas = estructura.partidas.map(p => ({
          ...p,
          precio_unitario: 0,
          parcial_partida: 0
        }));
        
        // Propagar totales de títulos (aunque sean 0)
        const partidasCalculadas = partidasCompletas.map(p => ({
          id_partida: p.id_partida,
          id_titulo: p.id_titulo,
          id_partida_padre: p.id_partida_padre,
          metrado: p.metrado,
          precio_unitario: 0,
          parcial_partida: 0
        }));
        
        const tiempoPropagarInicio = performance.now();
        const totalesTitulos = propagarTotalesTitulos(
          estructura.titulos.map(t => ({
            id_titulo: t.id_titulo,
            id_titulo_padre: t.id_titulo_padre
          })),
          partidasCalculadas
        );
        const tiempoPropagar = performance.now() - tiempoPropagarInicio;
        console.log(`[HOOK] ⏱️ Propagar totales títulos: ${tiempoPropagar.toFixed(2)}ms`);
        
        titulosCalculados = estructura.titulos.map(titulo => ({
          ...titulo,
          total_parcial: totalesTitulos.get(titulo.id_titulo) || 0
        }));
        
        parcialPresupuesto = calcularParcialPresupuesto(
          estructura.titulos.map(t => ({
            id_titulo: t.id_titulo,
            id_titulo_padre: t.id_titulo_padre
          })),
          totalesTitulos
        );
        const tiempoSinApusTotal = performance.now() - tiempoSinApusInicio;
        console.log(`[HOOK] ⏱️ Cálculo sin APUs: ${tiempoSinApusTotal.toFixed(2)}ms`);
      } else {
        const tiempoConApusInicio = performance.now();
        // Crear mapa de precios compartidos (id_precio_recurso -> precio)
        const tiempoMapaPreciosInicio = performance.now();
        const preciosCompartidosMap = new Map<string, number>();
        if (estructura.precios_compartidos && estructura.precios_compartidos.length > 0) {
          estructura.precios_compartidos.forEach(p => {
            preciosCompartidosMap.set(p.id_precio_recurso, p.precio);
          });
        }
        const tiempoMapaPrecios = performance.now() - tiempoMapaPreciosInicio;
        console.log(`[HOOK] ⏱️ Crear mapa precios compartidos: ${tiempoMapaPrecios.toFixed(2)}ms`);

        // Convertir APUs a formato de cálculo
        const tiempoConvertirApusInicio = performance.now();
        const apusCalculo: APUCalculo[] = estructura.apus.map(apu => ({
          id_apu: apu.id_apu,
          id_partida: apu.id_partida,
          rendimiento: apu.rendimiento,
          jornada: apu.jornada,
          recursos: apu.recursos.map(r => ({
            id_recurso_apu: r.id_recurso_apu,
            recurso_id: r.recurso_id,
            id_partida_subpartida: r.id_partida_subpartida,
            tipo_recurso: r.tipo_recurso,
            unidad_medida: r.unidad_medida,
            cantidad: r.cantidad,
            precio: r.precio,
            precio_override: r.precio_override,
            tiene_precio_override: r.tiene_precio_override || false,
            id_precio_recurso: r.id_precio_recurso, // NUEVO: para buscar precio compartido
            parcial: r.parcial, // NUEVO: para calcular precio si no hay compartido
            cuadrilla: r.cuadrilla,
            desperdicio_porcentaje: r.desperdicio_porcentaje,
            precio_unitario_subpartida: r.precio_unitario_subpartida
          }))
        }));
        const tiempoConvertirApus = performance.now() - tiempoConvertirApusInicio;
        console.log(`[HOOK] ⏱️ Convertir ${apusCalculo.length} APUs: ${tiempoConvertirApus.toFixed(2)}ms`);

        // Crear mapa para acceso rápido: id_partida -> APU
        const tiempoMapaApusInicio = performance.now();
        const mapaAPUs = crearMapaAPUsPorPartida(apusCalculo);
        const tiempoMapaApus = performance.now() - tiempoMapaApusInicio;
        console.log(`[HOOK] ⏱️ Crear mapa APUs: ${tiempoMapaApus.toFixed(2)}ms`);

        // Calcular precio_unitario y parcial_partida para cada partida
        const tiempoCalcularPartidasInicio = performance.now();
        const partidasCalculadas = calcularPartidas(
          estructura.partidas.map(p => ({
            id_partida: p.id_partida,
            id_titulo: p.id_titulo,
            id_partida_padre: p.id_partida_padre,
            metrado: p.metrado
          })),
          mapaAPUs,
          preciosCompartidosMap
        );
        const tiempoCalcularPartidas = performance.now() - tiempoCalcularPartidasInicio;
        console.log(`[HOOK] ⏱️ Calcular ${partidasCalculadas.length} partidas: ${tiempoCalcularPartidas.toFixed(2)}ms`);

        // Mapear partidas calculadas de vuelta al formato completo
        const tiempoMapearPartidasInicio = performance.now();
        partidasCompletas = estructura.partidas.map(partida => {
          const calculada = partidasCalculadas.find(p => p.id_partida === partida.id_partida);
          return {
            ...partida,
            precio_unitario: calculada?.precio_unitario || 0,
            parcial_partida: calculada?.parcial_partida || 0
          };
        });
        const tiempoMapearPartidas = performance.now() - tiempoMapearPartidasInicio;
        console.log(`[HOOK] ⏱️ Mapear partidas completas: ${tiempoMapearPartidas.toFixed(2)}ms`);

        // Propagar totales de títulos (ascendente)
        const tiempoPropagarInicio = performance.now();
        const totalesTitulos = propagarTotalesTitulos(
          estructura.titulos.map(t => ({
            id_titulo: t.id_titulo,
            id_titulo_padre: t.id_titulo_padre
          })),
          partidasCalculadas
        );
        const tiempoPropagar = performance.now() - tiempoPropagarInicio;
        console.log(`[HOOK] ⏱️ Propagar totales títulos: ${tiempoPropagar.toFixed(2)}ms`);

        // Actualizar títulos con totales calculados
        titulosCalculados = estructura.titulos.map(titulo => ({
          ...titulo,
          total_parcial: totalesTitulos.get(titulo.id_titulo) || 0
        }));

        // Calcular parcial_presupuesto
        parcialPresupuesto = calcularParcialPresupuesto(
          estructura.titulos.map(t => ({
            id_titulo: t.id_titulo,
            id_titulo_padre: t.id_titulo_padre
          })),
          totalesTitulos
        );
        const tiempoConApusTotal = performance.now() - tiempoConApusInicio;
        console.log(`[HOOK] ⏱️ Cálculo con APUs: ${tiempoConApusTotal.toFixed(2)}ms`);
      }

      // Calcular total_presupuesto (parcial + IGV + utilidad)
      const porcentajeIGV = estructura.presupuesto.porcentaje_igv || 0;
      const porcentajeUtilidad = estructura.presupuesto.porcentaje_utilidad || 0;
      const montoIGV = Math.round(parcialPresupuesto * porcentajeIGV / 100 * 100) / 100;
      const montoUtilidad = Math.round(parcialPresupuesto * porcentajeUtilidad / 100 * 100) / 100;
      const totalPresupuesto = Math.round((parcialPresupuesto + montoIGV + montoUtilidad) * 100) / 100;

      const tiempoCalculoTotal = performance.now() - tiempoCalculoInicio;
      console.log(`[HOOK] ⏱️ Cálculo total: ${tiempoCalculoTotal.toFixed(2)}ms`);

      return {
        ...estructura,
        presupuesto: {
          ...estructura.presupuesto,
          parcial_presupuesto: parcialPresupuesto,
          monto_igv: montoIGV,
          monto_utilidad: montoUtilidad,
          total_presupuesto: totalPresupuesto
        },
        partidas: partidasCompletas,
        titulos: titulosCalculados
      };
    },
    enabled: !!id_presupuesto,
    staleTime: 30000,
  });
}

export interface PresupuestoInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  costo_directo: number;
  monto_igv: number;
  monto_utilidad: number;
  parcial_presupuesto: number;
  observaciones: string;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  total_presupuesto: number;
  numeracion_presupuesto?: number;
}

export interface PresupuestoUpdateInput {
  id_presupuesto: string;
  nombre_presupuesto?: string;
  numeracion_presupuesto?: number;
  costo_directo?: number;
  monto_igv?: number;
  monto_utilidad?: number;
  observaciones?: string;
  porcentaje_igv?: number;
  porcentaje_utilidad?: number;
  plazo?: number;
  ppto_base?: number;
  ppto_oferta?: number;
  parcial_presupuesto?: number;
  total_presupuesto?: number;
}

export interface CrearPresupuestoPadreInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  porcentaje_igv?: number;
  porcentaje_utilidad?: number;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
}

/**
 * Hook para crear un presupuesto padre (sin detalles)
 */
export function useCreatePresupuestoPadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrearPresupuestoPadreInput) => {
      const response = await executeMutation<{ crearPresupuestoPadre: Presupuesto }>(
        CREAR_PRESUPUESTO_PADRE_MUTATION,
        input
      );
      return response.crearPresupuestoPadre;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', variables.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el presupuesto');
    },
  });
}

/**
 * Hook para actualizar presupuesto padre y propagar cambios a hijos
 */
export function useUpdatePresupuestoPadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id_presupuesto: string;
      nombre_presupuesto?: string;
      porcentaje_igv?: number;
      porcentaje_utilidad?: number;
    }) => {
      const response = await executeMutation<{ actualizarPresupuestoPadre: Presupuesto }>(
        ACTUALIZAR_PRESUPUESTO_PADRE_MUTATION,
        input
      );
      return response.actualizarPresupuestoPadre;
    },
    onSuccess: (presupuesto) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el presupuesto');
    },
  });
}

/**
 * Hook para crear versión 1 desde un presupuesto padre
 */
export function useCreateVersionDesdePadre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_padre: string; descripcion_version?: string }) => {
      const response = await executeMutation<{ crearVersionDesdePadre: Presupuesto }>(
        CREAR_VERSION_DESDE_PADRE_MUTATION,
        input
      );
      return response.crearVersionDesdePadre;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Versión 1 creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la versión');
    },
  });
}

/**
 * Hook para crear una nueva versión clonando un presupuesto completo (con estructura)
 */
export function useCreateVersionDesdeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_base: string; descripcion_version?: string }) => {
      const response = await executeMutation<{ crearVersionDesdeVersion: Presupuesto }>(
        CREAR_VERSION_DESDE_VERSION_MUTATION,
        {
          id_presupuesto_base: input.id_presupuesto_base,
          descripcion_version: input.descripcion_version,
        }
      );
      return response.crearVersionDesdeVersion;
    },
    onMutate: async () => {
      // Mostrar el toast inmediatamente
      const toastId = showCloningToast();
      // Pequeño delay para asegurar que el toast se renderice
      await new Promise(resolve => setTimeout(resolve, 100));
      return { cloningToastId: toastId };
    },
    onSuccess: (data, variables, context) => {
      if (context?.cloningToastId) {
        dismissCloningToast(context.cloningToastId);
      }
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase'] });
      // Invalidar también la query específica de la fase del presupuesto creado
      if (data.fase) {
        queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', data.fase] });
      }
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['estructura', data.id_presupuesto] });
      toast.success('Nueva versión creada exitosamente con toda la estructura');
    },
    onError: (error: any, variables, context) => {
      if (context?.cloningToastId) {
        dismissCloningToast(context.cloningToastId);
      }
      toast.error(error?.message || 'Error al crear la nueva versión');
    },
  });
}

/**
 * Hook para enviar versión 1 a licitación
 */
export function useEnviarALicitacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_presupuesto: string) => {
      const response = await executeMutation<{ enviarALicitacion: Presupuesto }>(
        ENVIAR_A_LICITACION_MUTATION,
        { id_presupuesto }
      );
      return response.enviarALicitacion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto enviado a licitación exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al enviar a licitación');
    },
  });
}

/**
 * Hook para pasar una versión de LICITACION a CONTRACTUAL
 * Ahora crea una aprobación en lugar de crear directamente el presupuesto contractual
 */
export function usePasarAContractual() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_licitacion: string; motivo?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await executeMutation<{
        pasarAContractual: {
          id_aprobacion: string;
          id_presupuesto: string;
          id_grupo_version?: string;
          id_proyecto: string;
          tipo_aprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META';
          usuario_solicitante_id: string;
          estado: string;
          fecha_solicitud: string;
          comentario_solicitud?: string;
          version_presupuesto?: number;
          monto_presupuesto?: number;
        };
      }>(PASAR_A_CONTRACTUAL_MUTATION, {
        id_presupuesto_licitacion: input.id_presupuesto_licitacion,
        usuario_solicitante_id: user.id,
        motivo: input.motivo,
      });
      return response.pasarAContractual;
    },
    onSuccess: (data) => {
      // Invalidar queries de ambas fases y aprobaciones
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'LICITACION'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      toast.success('Solicitud de aprobación creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear la solicitud de aprobación');
    },
  });
}

/**
 * Hook para crear presupuesto META desde una versión contractual
 */
export function useCrearPresupuestoMetaDesdeContractual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_contractual: string; motivo?: string }) => {
      const response = await executeMutation<{ 
        crearPresupuestoMetaDesdeContractual: Presupuesto 
      }>(
        CREAR_PRESUPUESTO_META_DESDE_CONTRACTUAL_MUTATION,
        input
      );
      return response.crearPresupuestoMetaDesdeContractual;
    },
    onMutate: async () => {
      // Mostrar el toast inmediatamente
      const toastId = showCloningToast();
      // Pequeño delay para asegurar que el toast se renderice
      await new Promise(resolve => setTimeout(resolve, 100));
      return { cloningToastId: toastId };
    },
    onSuccess: (data, variables, context) => {
      if (context?.cloningToastId) {
        dismissCloningToast(context.cloningToastId);
      }
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'CONTRACTUAL'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto Meta creado exitosamente');
    },
    onError: (error: any, variables, context) => {
      if (context?.cloningToastId) {
        dismissCloningToast(context.cloningToastId);
      }
      toast.error(error?.message || 'Error al crear presupuesto Meta');
    },
  });
}

/**
 * Hook para enviar versión META en estado borrador a aprobación
 */
export function useEnviarVersionMetaAAprobacion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_meta: string; comentario?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      const response = await executeMutation<{ 
        enviarVersionMetaAAprobacion: {
          id_aprobacion: string;
          id_presupuesto: string;
          id_grupo_version: string;
          id_proyecto: string;
          tipo_aprobacion: string;
          usuario_solicitante_id: string;
          estado: string;
          fecha_solicitud: string;
          comentario_solicitud?: string;
          version_presupuesto?: number;
          monto_presupuesto?: number;
        }
      }>(ENVIAR_VERSION_META_A_APROBACION_MUTATION, {
        id_presupuesto_meta: input.id_presupuesto_meta,
        usuario_solicitante_id: user.id,
        comentario: input.comentario,
      });
      return response.enviarVersionMetaAAprobacion;
    },
    onSuccess: (data) => {
      // Invalidar queries de presupuestos META y aprobaciones
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      toast.success('Versión enviada a aprobación exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al enviar versión a aprobación');
    },
  });
}

/**
 * Hook para enviar versión META aprobada a oficialización (poner en vigencia)
 */
export function useEnviarVersionMetaAOficializacion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { id_presupuesto_meta: string; comentario?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      const response = await executeMutation<{ 
        enviarVersionMetaAOficializacion: {
          id_aprobacion: string;
          id_presupuesto: string;
          id_grupo_version: string;
          id_proyecto: string;
          tipo_aprobacion: string;
          usuario_solicitante_id: string;
          estado: string;
          fecha_solicitud: string;
          comentario_solicitud?: string;
          version_presupuesto?: number;
          monto_presupuesto?: number;
        }
      }>(ENVIAR_VERSION_META_A_OFICIALIZACION_MUTATION, {
        id_presupuesto_meta: input.id_presupuesto_meta,
        usuario_solicitante_id: user.id,
        comentario: input.comentario,
      });
      return response.enviarVersionMetaAOficializacion;
    },
    onSuccess: (data) => {
      // Invalidar queries de presupuestos META y aprobaciones
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'fase', 'META'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', data.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      toast.success('Versión enviada a oficialización exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al enviar versión a oficialización');
    },
  });
}

/**
 * Hook para crear un presupuesto (legacy - mantener para compatibilidad)
 */
export function useCreatePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PresupuestoInput) => {
      const response = await executeMutation<{ addPresupuesto: Presupuesto }>(
        ADD_PRESUPUESTO_MUTATION,
        input
      );
      return response.addPresupuesto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos', 'proyecto', variables.id_proyecto] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al crear el presupuesto');
    },
  });
}

/**
 * Hook para actualizar un presupuesto
 */
export function useUpdatePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PresupuestoUpdateInput) => {
      const response = await executeMutation<{ updatePresupuesto: Presupuesto }>(
        UPDATE_PRESUPUESTO_MUTATION,
        input
      );
      return response.updatePresupuesto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      queryClient.invalidateQueries({ queryKey: ['presupuesto'] });
      toast.success('Presupuesto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar el presupuesto');
    },
  });
}

/**
 * Hook para eliminar un presupuesto
 */
export function useDeletePresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_presupuesto: string) => {
      const response = await executeMutation<{ deletePresupuesto: Presupuesto }>(
        DELETE_PRESUPUESTO_MUTATION,
        { id_presupuesto }
      );
      return response.deletePresupuesto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el presupuesto');
    },
  });
}

export interface EliminacionGrupoResponse {
  success: boolean;
  message: string;
  grupo_version_eliminado: string;
}

/**
 * Hook para eliminar todo el grupo de versiones de presupuesto (solo en estado BORRADOR)
 */
export function useEliminarGrupoPresupuestoCompleto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id_grupo_version: string) => {
      const response = await executeMutation<{ eliminarGrupoPresupuestoCompleto: EliminacionGrupoResponse }>(
        ELIMINAR_GRUPO_PRESUPUESTO_COMPLETO_MUTATION,
        { id_grupo_version }
      );
      return response.eliminarGrupoPresupuestoCompleto;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
        queryClient.invalidateQueries({ queryKey: ['proyectos'] });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar el grupo de presupuesto');
    },
  });
}

