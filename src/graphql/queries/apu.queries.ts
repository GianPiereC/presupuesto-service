/**
 * Queries GraphQL para APU (Análisis de Precio Unitario)
 */

export const GET_APU_BY_PARTIDA_QUERY = `
  query GetApuByPartida($id_partida: String!) {
    getApuByPartida(id_partida: $id_partida) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      jornada
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
        id_partida_subpartida
        codigo_recurso
        descripcion
        unidad_medida
        tipo_recurso
        id_precio_recurso
        precio
        cuadrilla
        cantidad
        desperdicio_porcentaje
        cantidad_con_desperdicio
        parcial
        precio_unitario_subpartida
        tiene_precio_override
        precio_override
        orden
      }
    }
  }
`;

export const GET_APU_QUERY = `
  query GetApu($id_apu: String!) {
    getApu(id_apu: $id_apu) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      jornada
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
        id_partida_subpartida
        codigo_recurso
        descripcion
        unidad_medida
        tipo_recurso
        id_precio_recurso
        precio
        cuadrilla
        cantidad
        desperdicio_porcentaje
        cantidad_con_desperdicio
        parcial
        precio_unitario_subpartida
        tiene_precio_override
        precio_override
        orden
      }
    }
  }
`;

export const GET_APUS_BY_PRESUPUESTO_QUERY = `
  query GetApusByPresupuesto($id_presupuesto: String!) {
    getApusByPresupuesto(id_presupuesto: $id_presupuesto) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      jornada
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
        id_partida_subpartida
        codigo_recurso
        descripcion
        unidad_medida
        tipo_recurso
        id_precio_recurso
        precio
        cuadrilla
        cantidad
        desperdicio_porcentaje
        cantidad_con_desperdicio
        parcial
        precio_unitario_subpartida
        tiene_precio_override
        precio_override
        orden
      }
    }
  }
`;

