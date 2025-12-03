/**
 * Mutations GraphQL para APU (Análisis de Precio Unitario)
 */

export const CREATE_APU_MUTATION = `
  mutation CreateApu(
    $id_partida: String!
    $id_presupuesto: String!
    $id_proyecto: String!
    $rendimiento: Float!
    $jornada: Float
    $recursos: [RecursoApuInput!]!
  ) {
    createApu(
      id_partida: $id_partida
      id_presupuesto: $id_presupuesto
      id_proyecto: $id_proyecto
      rendimiento: $rendimiento
      jornada: $jornada
      recursos: $recursos
    ) {
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
        orden
      }
    }
  }
`;

export const UPDATE_APU_MUTATION = `
  mutation UpdateApu(
    $id_apu: String!
    $rendimiento: Float
    $jornada: Float
  ) {
    updateApu(
      id_apu: $id_apu
      rendimiento: $rendimiento
      jornada: $jornada
    ) {
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
        orden
      }
    }
  }
`;

export const ADD_RECURSO_TO_APU_MUTATION = `
  mutation AddRecursoToApu(
    $id_apu: String!
    $recurso: RecursoApuInput!
  ) {
    addRecursoToApu(
      id_apu: $id_apu
      recurso: $recurso
    ) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
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
        orden
      }
    }
  }
`;

export const UPDATE_RECURSO_IN_APU_MUTATION = `
  mutation UpdateRecursoInApu(
    $id_apu: String!
    $id_recurso_apu: String!
    $recurso: RecursoApuInput!
  ) {
    updateRecursoInApu(
      id_apu: $id_apu
      id_recurso_apu: $id_recurso_apu
      recurso: $recurso
    ) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
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
        orden
      }
    }
  }
`;

export const REMOVE_RECURSO_FROM_APU_MUTATION = `
  mutation RemoveRecursoFromApu(
    $id_apu: String!
    $id_recurso_apu: String!
  ) {
    removeRecursoFromApu(
      id_apu: $id_apu
      id_recurso_apu: $id_recurso_apu
    ) {
      _id
      id_apu
      id_partida
      id_presupuesto
      id_proyecto
      rendimiento
      costo_materiales
      costo_mano_obra
      costo_equipos
      costo_subcontratos
      costo_directo
      recursos {
        id_recurso_apu
        recurso_id
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
        orden
      }
    }
  }
`;

