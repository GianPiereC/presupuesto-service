/**
 * Queries GraphQL para Especialidades
 */

export const LIST_ESPECIALIDADES_QUERY = `
  query ListEspecialidades {
    listEspecialidades {
      _id
      id_especialidad
      nombre
      descripcion
    }
  }
`;

export const GET_ESPECIALIDAD_QUERY = `
  query GetEspecialidad($id_especialidad: String!) {
    getEspecialidad(id_especialidad: $id_especialidad) {
      _id
      id_especialidad
      nombre
      descripcion
    }
  }
`;





