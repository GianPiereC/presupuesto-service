/**
 * Queries GraphQL para Aprobaciones de Presupuestos
 */

export const GET_APROBACIONES_PENDIENTES_AGRUPADAS_QUERY = `
  query GetAprobacionesPendientesAgrupadas {
    getAprobacionesPendientesAgrupadas {
      proyecto {
        id_proyecto
        nombre_proyecto
        cliente
        empresa
        estado
        total_proyecto
        plazo
        fecha_creacion
      }
      gruposPresupuestos {
        id_aprobacion
        id_grupo_version
        presupuestoPadre {
          id_presupuesto
          nombre_presupuesto
          fecha_creacion
          total_presupuesto
        }
        versiones {
          id_presupuesto
          nombre_presupuesto
          version
          fecha_creacion
          total_presupuesto
          descripcion_version
        }
        tipoAprobacion
      }
    }
  }
`;

export const GET_APROBACIONES_PENDIENTES_QUERY = `
  query GetAprobacionesPendientes {
    getAprobacionesPendientes {
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

export const GET_APROBACIONES_POR_PRESUPUESTO_QUERY = `
  query GetAprobacionesPorPresupuesto($id_presupuesto: String!) {
    getAprobacionesPorPresupuesto(id_presupuesto: $id_presupuesto) {
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

export const GET_APROBACION_QUERY = `
  query GetAprobacion($id_aprobacion: String!) {
    getAprobacion(id_aprobacion: $id_aprobacion) {
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

