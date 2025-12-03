/**
 * Mutations GraphQL para Proyectos
 */

export const ADD_PROYECTO_MUTATION = `
  mutation AddProyecto(
    $id_usuario: String!
    $id_infraestructura: String!
    $nombre_proyecto: String!
    $id_departamento: String!
    $id_provincia: String!
    $id_distrito: String!
    $id_localidad: String
    $total_proyecto: Float
    $estado: String!
    $cliente: String!
    $empresa: String!
    $plazo: Int!
    $ppto_base: Float!
    $ppto_oferta: Float!
    $jornada: Float!
  ) {
    addProyecto(
      id_usuario: $id_usuario
      id_infraestructura: $id_infraestructura
      nombre_proyecto: $nombre_proyecto
      id_departamento: $id_departamento
      id_provincia: $id_provincia
      id_distrito: $id_distrito
      id_localidad: $id_localidad
      total_proyecto: $total_proyecto
      estado: $estado
      cliente: $cliente
      empresa: $empresa
      plazo: $plazo
      ppto_base: $ppto_base
      ppto_oferta: $ppto_oferta
      jornada: $jornada
    ) {
      _id
      id_proyecto
      nombre_proyecto
      cliente
      empresa
      estado
      total_proyecto
      fecha_creacion
    }
  }
`;

export const UPDATE_PROYECTO_MUTATION = `
  mutation UpdateProyecto(
    $id_proyecto: String!
    $nombre_proyecto: String
    $estado: String
    $total_proyecto: Float
    $cliente: String
    $empresa: String
    $plazo: Int
    $ppto_base: Float
    $ppto_oferta: Float
    $jornada: Float
    $id_departamento: String
    $id_distrito: String
    $id_infraestructura: String
    $id_localidad: String
    $id_provincia: String
  ) {
    updateProyecto(
      id_proyecto: $id_proyecto
      nombre_proyecto: $nombre_proyecto
      estado: $estado
      total_proyecto: $total_proyecto
      cliente: $cliente
      empresa: $empresa
      plazo: $plazo
      ppto_base: $ppto_base
      ppto_oferta: $ppto_oferta
      jornada: $jornada
      id_departamento: $id_departamento
      id_distrito: $id_distrito
      id_infraestructura: $id_infraestructura
      id_localidad: $id_localidad
      id_provincia: $id_provincia
    ) {
      _id
      id_proyecto
      nombre_proyecto
      cliente
      empresa
      estado
      total_proyecto
      fecha_creacion
    }
  }
`;

export const DELETE_PROYECTO_MUTATION = `
  mutation DeleteProyecto($id_proyecto: String!) {
    deleteProyecto(id_proyecto: $id_proyecto) {
      _id
      id_proyecto
      nombre_proyecto
    }
  }
`;

