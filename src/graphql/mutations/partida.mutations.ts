/**
 * Mutations GraphQL para Partidas
 */

export const CREATE_PARTIDA_MUTATION = `
  mutation CreatePartida(
    $id_presupuesto: String!
    $id_proyecto: String!
    $id_titulo: String!
    $id_partida_padre: String
    $nivel_partida: Int!
    $numero_item: String!
    $codigo_partida: String!
    $descripcion: String!
    $unidad_medida: String!
    $metrado: Float!
    $precio_unitario: Float!
    $parcial_partida: Float
    $orden: Int!
    $estado: EstadoPartida
  ) {
    createPartida(
      id_presupuesto: $id_presupuesto
      id_proyecto: $id_proyecto
      id_titulo: $id_titulo
      id_partida_padre: $id_partida_padre
      nivel_partida: $nivel_partida
      numero_item: $numero_item
      codigo_partida: $codigo_partida
      descripcion: $descripcion
      unidad_medida: $unidad_medida
      metrado: $metrado
      precio_unitario: $precio_unitario
      parcial_partida: $parcial_partida
      orden: $orden
      estado: $estado
    ) {
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
  }
`;

export const UPDATE_PARTIDA_MUTATION = `
  mutation UpdatePartida(
    $id_partida: String!
    $id_titulo: String
    $id_partida_padre: String
    $nivel_partida: Int
    $numero_item: String
    $codigo_partida: String
    $descripcion: String
    $unidad_medida: String
    $metrado: Float
    $precio_unitario: Float
    $parcial_partida: Float
    $orden: Int
    $estado: EstadoPartida
  ) {
    updatePartida(
      id_partida: $id_partida
      id_titulo: $id_titulo
      id_partida_padre: $id_partida_padre
      nivel_partida: $nivel_partida
      numero_item: $numero_item
      codigo_partida: $codigo_partida
      descripcion: $descripcion
      unidad_medida: $unidad_medida
      metrado: $metrado
      precio_unitario: $precio_unitario
      parcial_partida: $parcial_partida
      orden: $orden
      estado: $estado
    ) {
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
  }
`;

export const DELETE_PARTIDA_MUTATION = `
  mutation DeletePartida($id_partida: String!) {
    deletePartida(id_partida: $id_partida) {
      id_partida
      descripcion
    }
  }
`;

