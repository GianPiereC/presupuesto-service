/**
 * Queries GraphQL para Títulos
 */

export const GET_TITULOS_BY_PRESUPUESTO_QUERY = `
  query GetTitulosByPresupuesto($id_presupuesto: String!) {
    getTitulosByPresupuesto(id_presupuesto: $id_presupuesto) {
      _id
      id_titulo
      id_presupuesto
      id_proyecto
      id_titulo_padre
      id_titulo_plantilla
      item
      descripcion
      parcial
      fecha_creacion
      id_especialidad
      nivel
      orden
      tipo
      detallePartida {
        _id
        id_detalle_partida
        unidad_id
        id_titulo
        metrado
        precio
        jornada
        rendimiento
      }
    }
  }
`;

export const GET_TITULO_QUERY = `
  query GetTitulo($id_titulo: String!) {
    getTitulo(id_titulo: $id_titulo) {
      _id
      id_titulo
      id_presupuesto
      id_proyecto
      id_titulo_padre
      id_titulo_plantilla
      item
      descripcion
      parcial
      fecha_creacion
      id_especialidad
      nivel
      orden
      tipo
      detallePartida {
        _id
        id_detalle_partida
        unidad_id
        id_titulo
        metrado
        precio
        jornada
        rendimiento
      }
    }
  }
`;




