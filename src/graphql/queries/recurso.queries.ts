/**
 * Queries GraphQL para Recursos
 */

export const LIST_RECURSOS_PAGINATED_QUERY = `
  query ListRecursosPaginated($input: ListRecursoPaginationInput) {
    listRecursosPaginated(input: $input) {
      info {
        page
        total
        itemsPage
        pages
      }
      status
      message
      recursos {
        id
        recurso_id
        codigo
        nombre
        descripcion
        cantidad
        unidad_id
        unidad {
          nombre
          unidad_id
          descripcion
        }
        precio_actual
        tipo_recurso_id
        tipo_recurso {
          nombre
          codigo
        }
        tipo_costo_recurso_id
        tipo_costo_recurso {
          nombre
        }
        clasificacion_recurso_id
        clasificacion_recurso {
          nombre
          parent_id
        }
        fecha
        vigente
        usado
        imagenes {
          id
          file
        }
        activo_fijo
        combustible_ids
        estado_activo_fijo
        fecha_checked_activo_fijo
      }
    }
  }
`;

