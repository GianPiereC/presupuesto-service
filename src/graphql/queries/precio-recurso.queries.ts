/**
 * Queries GraphQL para PrecioRecursoPresupuesto
 */

export const GET_PRECIO_RECURSO_BY_PRESUPUESTO_Y_RECURSO = `
  query GetPrecioRecursoByPresupuestoYRecurso($id_presupuesto: String!, $recurso_id: String!) {
    getPrecioRecursoByPresupuestoYRecurso(
      id_presupuesto: $id_presupuesto
      recurso_id: $recurso_id
    ) {
      id_precio_recurso
      id_presupuesto
      recurso_id
      codigo_recurso
      descripcion
      unidad
      tipo_recurso
      precio
      fecha_actualizacion
      usuario_actualizo
    }
  }
`;

export const GET_PRECIOS_RECURSO_BY_PRESUPUESTO = `
  query GetPreciosRecursoByPresupuesto($id_presupuesto: String!) {
    getPreciosRecursoByPresupuesto(id_presupuesto: $id_presupuesto) {
      id_precio_recurso
      id_presupuesto
      recurso_id
      codigo_recurso
      descripcion
      unidad
      tipo_recurso
      precio
      fecha_actualizacion
      usuario_actualizo
    }
  }
`;

