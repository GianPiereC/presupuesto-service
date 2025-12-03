/**
 * Mutations GraphQL para operaciones batch de estructura con transacciones
 */

export const BATCH_ESTRUCTURA_PRESUPUESTO_MUTATION = `
  mutation BatchEstructuraPresupuesto($input: BatchEstructuraInput!) {
    batchEstructuraPresupuesto(input: $input) {
      success
      message
      titulosCreados {
        _id
        id_titulo
        id_presupuesto
        id_proyecto
        id_titulo_padre
        nivel
        numero_item
        descripcion
        tipo
        orden
        total_parcial
      }
      partidasCreadas {
        _id
        id_partida
        id_presupuesto
        id_proyecto
        id_titulo
        id_partida_padre
        nivel_partida
        numero_item
        codigo_partida
        descripcion
        unidad_medida
        metrado
        precio_unitario
        parcial_partida
        orden
        estado
      }
      titulosActualizados {
        _id
        id_titulo
        id_presupuesto
        id_proyecto
        id_titulo_padre
        nivel
        numero_item
        descripcion
        tipo
        orden
        total_parcial
      }
      partidasActualizadas {
        _id
        id_partida
        id_presupuesto
        id_proyecto
        id_titulo
        id_partida_padre
        nivel_partida
        numero_item
        codigo_partida
        descripcion
        unidad_medida
        metrado
        precio_unitario
        parcial_partida
        orden
        estado
      }
      titulosEliminados
      partidasEliminadas
    }
  }
`;

