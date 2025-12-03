/**
 * Mutations GraphQL para Presupuestos
 */

export const ADD_PRESUPUESTO_MUTATION = `
  mutation AddPresupuesto(
    $id_proyecto: String!
    $costo_directo: Float!
    $monto_igv: Float!
    $monto_utilidad: Float!
    $nombre_presupuesto: String!
    $numeracion_presupuesto: Int
    $parcial_presupuesto: Float!
    $observaciones: String!
    $porcentaje_igv: Float!
    $porcentaje_utilidad: Float!
    $plazo: Int!
    $ppto_base: Float!
    $ppto_oferta: Float!
    $total_presupuesto: Float!
  ) {
    addPresupuesto(
      id_proyecto: $id_proyecto
      costo_directo: $costo_directo
      monto_igv: $monto_igv
      monto_utilidad: $monto_utilidad
      nombre_presupuesto: $nombre_presupuesto
      numeracion_presupuesto: $numeracion_presupuesto
      parcial_presupuesto: $parcial_presupuesto
      observaciones: $observaciones
      porcentaje_igv: $porcentaje_igv
      porcentaje_utilidad: $porcentaje_utilidad
      plazo: $plazo
      ppto_base: $ppto_base
      ppto_oferta: $ppto_oferta
      total_presupuesto: $total_presupuesto
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      costo_directo
      monto_igv
      monto_utilidad
      parcial_presupuesto
      total_presupuesto
      porcentaje_igv
      porcentaje_utilidad
      plazo
      ppto_base
      ppto_oferta
      fecha_creacion
      observaciones
      numeracion_presupuesto
    }
  }
`;

export const UPDATE_PRESUPUESTO_MUTATION = `
  mutation UpdatePresupuesto(
    $id_presupuesto: String!
    $nombre_presupuesto: String
    $numeracion_presupuesto: Int
    $costo_directo: Float
    $monto_igv: Float
    $monto_utilidad: Float
    $observaciones: String
    $porcentaje_igv: Float
    $porcentaje_utilidad: Float
    $plazo: Int
    $ppto_base: Float
    $ppto_oferta: Float
    $total_presupuesto: Float
  ) {
    updatePresupuesto(
      id_presupuesto: $id_presupuesto
      nombre_presupuesto: $nombre_presupuesto
      numeracion_presupuesto: $numeracion_presupuesto
      costo_directo: $costo_directo
      monto_igv: $monto_igv
      monto_utilidad: $monto_utilidad
      observaciones: $observaciones
      porcentaje_igv: $porcentaje_igv
      porcentaje_utilidad: $porcentaje_utilidad
      plazo: $plazo
      ppto_base: $ppto_base
      ppto_oferta: $ppto_oferta
      total_presupuesto: $total_presupuesto
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      costo_directo
      monto_igv
      monto_utilidad
      parcial_presupuesto
      total_presupuesto
      porcentaje_igv
      porcentaje_utilidad
      plazo
      ppto_base
      ppto_oferta
      fecha_creacion
      observaciones
      numeracion_presupuesto
    }
  }
`;

export const DELETE_PRESUPUESTO_MUTATION = `
  mutation DeletePresupuesto($id_presupuesto: String!) {
    deletePresupuesto(id_presupuesto: $id_presupuesto) {
      _id
      id_presupuesto
      nombre_presupuesto
    }
  }
`;

export const CREAR_PRESUPUESTO_PADRE_MUTATION = `
  mutation CrearPresupuestoPadre(
    $id_proyecto: String!
    $nombre_presupuesto: String!
    $porcentaje_igv: Float
    $porcentaje_utilidad: Float
    $fase: FasePresupuesto
  ) {
    crearPresupuestoPadre(
      id_proyecto: $id_proyecto
      nombre_presupuesto: $nombre_presupuesto
      porcentaje_igv: $porcentaje_igv
      porcentaje_utilidad: $porcentaje_utilidad
      fase: $fase
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      porcentaje_igv
      porcentaje_utilidad
      id_grupo_version
      fase
      version
      es_padre
      estado
      fecha_creacion
    }
  }
`;

export const CREAR_VERSION_DESDE_PADRE_MUTATION = `
  mutation CrearVersionDesdePadre(
    $id_presupuesto_padre: String!
    $descripcion_version: String
  ) {
    crearVersionDesdePadre(
      id_presupuesto_padre: $id_presupuesto_padre
      descripcion_version: $descripcion_version
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      id_grupo_version
      fase
      version
      es_padre
      estado
      fecha_creacion
      descripcion_version
    }
  }
`;

export const CREAR_VERSION_DESDE_VERSION_MUTATION = `
  mutation CrearVersionDesdeVersion(
    $id_presupuesto_base: String!
    $descripcion_version: String
  ) {
    crearVersionDesdeVersion(
      id_presupuesto_base: $id_presupuesto_base
      descripcion_version: $descripcion_version
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      id_grupo_version
      fase
      version
      es_padre
      estado
      fecha_creacion
      descripcion_version
    }
  }
`;

export const ENVIAR_A_LICITACION_MUTATION = `
  mutation EnviarALicitacion(
    $id_presupuesto: String!
  ) {
    enviarALicitacion(
      id_presupuesto: $id_presupuesto
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      id_grupo_version
      fase
      version
      es_padre
      estado
      fecha_creacion
    }
  }
`;

export const PASAR_A_CONTRACTUAL_MUTATION = `
  mutation PasarAContractual(
    $id_presupuesto_licitacion: String!
    $usuario_solicitante_id: String!
    $motivo: String
  ) {
    pasarAContractual(
      id_presupuesto_licitacion: $id_presupuesto_licitacion
      usuario_solicitante_id: $usuario_solicitante_id
      motivo: $motivo
    ) {
      id_aprobacion
      id_presupuesto
      id_grupo_version
      id_proyecto
      tipo_aprobacion
      usuario_solicitante_id
      estado
      fecha_solicitud
      comentario_solicitud
      version_presupuesto
      monto_presupuesto
    }
  }
`;

export const ACTUALIZAR_PRESUPUESTO_PADRE_MUTATION = `
  mutation ActualizarPresupuestoPadre(
    $id_presupuesto: String!
    $nombre_presupuesto: String
    $porcentaje_igv: Float
    $porcentaje_utilidad: Float
  ) {
    actualizarPresupuestoPadre(
      id_presupuesto: $id_presupuesto
      nombre_presupuesto: $nombre_presupuesto
      porcentaje_igv: $porcentaje_igv
      porcentaje_utilidad: $porcentaje_utilidad
    ) {
      _id
      id_presupuesto
      nombre_presupuesto
      porcentaje_igv
      porcentaje_utilidad
    }
  }
`;

export const CREAR_PRESUPUESTO_META_DESDE_CONTRACTUAL_MUTATION = `
  mutation CrearPresupuestoMetaDesdeContractual(
    $id_presupuesto_contractual: String!
    $motivo: String
  ) {
    crearPresupuestoMetaDesdeContractual(
      id_presupuesto_contractual: $id_presupuesto_contractual
      motivo: $motivo
    ) {
      _id
      id_presupuesto
      id_proyecto
      nombre_presupuesto
      id_grupo_version
      fase
      version
      es_padre
      estado
      fecha_creacion
      descripcion_version
      total_presupuesto
    }
  }
`;

export const ELIMINAR_GRUPO_PRESUPUESTO_COMPLETO_MUTATION = `
  mutation EliminarGrupoPresupuestoCompleto($id_grupo_version: String!) {
    eliminarGrupoPresupuestoCompleto(id_grupo_version: $id_grupo_version) {
      success
      message
      grupo_version_eliminado
    }
  }
`;

export const ENVIAR_VERSION_META_A_APROBACION_MUTATION = `
  mutation EnviarVersionMetaAAprobacion(
    $id_presupuesto_meta: String!
    $usuario_solicitante_id: String!
    $comentario: String
  ) {
    enviarVersionMetaAAprobacion(
      id_presupuesto_meta: $id_presupuesto_meta
      usuario_solicitante_id: $usuario_solicitante_id
      comentario: $comentario
    ) {
      id_aprobacion
      id_presupuesto
      id_grupo_version
      id_proyecto
      tipo_aprobacion
      usuario_solicitante_id
      estado
      fecha_solicitud
      comentario_solicitud
      version_presupuesto
      monto_presupuesto
    }
  }
`;

