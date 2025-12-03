/**
 * Queries GraphQL para Proyectos
 */

export const LIST_PROYECTOS_PAGINATED_QUERY = `
  query ListProyectosPaginated($input: PaginationFilterInput) {
    listProyectosPaginated(input: $input) {
      data {
        _id
        id_proyecto
        id_usuario
        id_infraestructura
        nombre_proyecto
        id_departamento
        id_provincia
        id_distrito
        id_localidad
        total_proyecto
        estado
        fecha_creacion
        fecha_ultimo_calculo
        cliente
        empresa
        plazo
        ppto_base
        ppto_oferta
        jornada
      }
      pagination {
        page
        limit
        total
        totalPages
        hasNext
        hasPrev
      }
    }
  }
`;

export const GET_PROYECTO_QUERY = `
  query GetProyecto($id_proyecto: String!) {
    getProyecto(id_proyecto: $id_proyecto) {
      _id
      id_proyecto
      id_usuario
      id_infraestructura
      nombre_proyecto
      id_departamento
      id_provincia
      id_distrito
      id_localidad
      total_proyecto
      estado
      fecha_creacion
      fecha_ultimo_calculo
      cliente
      empresa
      plazo
      ppto_base
      ppto_oferta
      jornada
    }
  }
`;

