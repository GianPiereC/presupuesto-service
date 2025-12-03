/**
 * Mutations GraphQL para Títulos (actualizado para nuevo schema)
 */

export const CREATE_TITULO_MUTATION = `
  mutation CreateTitulo(
    $id_presupuesto: String!
    $id_proyecto: String!
    $id_titulo_padre: String
    $nivel: Int!
    $numero_item: String!
    $descripcion: String!
    $tipo: TipoTitulo!
    $orden: Int!
    $total_parcial: Float
  ) {
    createTitulo(
      id_presupuesto: $id_presupuesto
      id_proyecto: $id_proyecto
      id_titulo_padre: $id_titulo_padre
      nivel: $nivel
      numero_item: $numero_item
      descripcion: $descripcion
      tipo: $tipo
      orden: $orden
      total_parcial: $total_parcial
    ) {
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
  }
`;

export const UPDATE_TITULO_MUTATION = `
  mutation UpdateTitulo(
    $id_titulo: String!
    $id_titulo_padre: String
    $nivel: Int
    $numero_item: String
    $descripcion: String
    $tipo: TipoTitulo
    $orden: Int
    $total_parcial: Float
  ) {
    updateTitulo(
      id_titulo: $id_titulo
      id_titulo_padre: $id_titulo_padre
      nivel: $nivel
      numero_item: $numero_item
      descripcion: $descripcion
      tipo: $tipo
      orden: $orden
      total_parcial: $total_parcial
    ) {
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
  }
`;

export const DELETE_TITULO_MUTATION = `
  mutation DeleteTitulo($id_titulo: String!) {
    deleteTitulo(id_titulo: $id_titulo) {
      id_titulo
      descripcion
    }
  }
`;

// Mantener las mutaciones antiguas para compatibilidad (si se usan en otros lugares)
export const ADD_TITULO_MUTATION = CREATE_TITULO_MUTATION;
export const UPDATE_TITULOS_MASIVO_MUTATION = UPDATE_TITULO_MUTATION;
