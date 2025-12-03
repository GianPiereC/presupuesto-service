/**
 * Mutations GraphQL para Aprobaciones de Presupuestos
 */

export const APROBAR_PRESUPUESTO_MUTATION = `
  mutation AprobarPresupuesto(
    $id_aprobacion: String!
    $usuario_aprobador_id: String!
    $comentario: String
  ) {
    aprobarPresupuesto(
      id_aprobacion: $id_aprobacion
      usuario_aprobador_id: $usuario_aprobador_id
      comentario: $comentario
    ) {
      id_aprobacion
      id_presupuesto
      id_grupo_version
      id_proyecto
      tipo_aprobacion
      usuario_solicitante_id
      usuario_aprobador_id
      estado
      fecha_solicitud
      fecha_aprobacion
      fecha_rechazo
      comentario_solicitud
      comentario_aprobacion
      comentario_rechazo
      version_presupuesto
      monto_presupuesto
    }
  }
`;

export const RECHAZAR_PRESUPUESTO_MUTATION = `
  mutation RechazarPresupuesto(
    $id_aprobacion: String!
    $usuario_aprobador_id: String!
    $comentario: String!
  ) {
    rechazarPresupuesto(
      id_aprobacion: $id_aprobacion
      usuario_aprobador_id: $usuario_aprobador_id
      comentario: $comentario
    ) {
      id_aprobacion
      id_presupuesto
      id_grupo_version
      id_proyecto
      tipo_aprobacion
      usuario_solicitante_id
      usuario_aprobador_id
      estado
      fecha_solicitud
      fecha_aprobacion
      fecha_rechazo
      comentario_solicitud
      comentario_aprobacion
      comentario_rechazo
      version_presupuesto
      monto_presupuesto
    }
  }
`;

