/**
 * Queries GraphQL para Catálogos (Departamento, Provincia, Distrito, Localidad)
 */

export const LIST_DEPARTAMENTOS_QUERY = `
  query ListDepartamentos($esNuevoFormato: Boolean) {
    listDepartamentos(esNuevoFormato: $esNuevoFormato) {
      _id
      id_departamento
      nombre_departamento
      ubigeo
      esNuevoFormato
    }
  }
`;

export const GET_DEPARTAMENTO_QUERY = `
  query GetDepartamento($id_departamento: String!) {
    getDepartamento(id_departamento: $id_departamento) {
      _id
      id_departamento
      nombre_departamento
      ubigeo
      esNuevoFormato
    }
  }
`;

export const LIST_PROVINCIAS_QUERY = `
  query ListProvincias {
    listProvincias {
      _id
      id_provincia
      id_departamento
      nombre_provincia
      ubigeo
      esNuevoFormato
    }
  }
`;

export const GET_PROVINCIAS_BY_DEPARTAMENTO_QUERY = `
  query GetProvinciasByDepartamento($id_departamento: String!) {
    getProvinciasByDepartamento(id_departamento: $id_departamento) {
      _id
      id_provincia
      id_departamento
      nombre_provincia
      ubigeo
      esNuevoFormato
    }
  }
`;

export const LIST_DISTRITOS_QUERY = `
  query ListDistritos {
    listDistritos {
      _id
      id_distrito
      id_provincia
      nombre_distrito
      id_departamento
      ubigeo
      esNuevoFormato
    }
  }
`;

export const GET_DISTRITOS_BY_PROVINCIA_QUERY = `
  query GetDistritosByProvincia($id_provincia: String!) {
    getDistritosByProvincia(id_provincia: $id_provincia) {
      _id
      id_distrito
      id_provincia
      nombre_distrito
      id_departamento
      ubigeo
      esNuevoFormato
    }
  }
`;

export const LIST_LOCALIDADES_QUERY = `
  query ListLocalidades {
    listLocalidades {
      _id
      id_localidad
      id_distrito
      nombre_localidad
    }
  }
`;

export const GET_LOCALIDADES_BY_DISTRITO_QUERY = `
  query GetLocalidadesByDistrito($id_distrito: String!) {
    getLocalidadesByDistrito(id_distrito: $id_distrito) {
      _id
      id_localidad
      id_distrito
      nombre_localidad
    }
  }
`;

export const LIST_INFRAESTRUCTURAS_QUERY = `
  query ListInfraestructuras {
    listInfraestructuras {
      _id
      id_infraestructura
      nombre_infraestructura
      tipo_infraestructura
      descripcion
    }
  }
`;

export const GET_INFRAESTRUCTURA_QUERY = `
  query GetInfraestructura($id_infraestructura: String!) {
    getInfraestructura(id_infraestructura: $id_infraestructura) {
      _id
      id_infraestructura
      nombre_infraestructura
      tipo_infraestructura
      descripcion
    }
  }
`;

