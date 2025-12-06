/**
 * Queries GraphQL para Presupuestos
 */

export const GET_PRESUPUESTOS_BY_PROYECTO_QUERY = `
  query GetPresupuestosByProyecto($id_proyecto: String!) {
    getPresupuestosByProyecto(id_proyecto: $id_proyecto) {
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
      fase
      version
      descripcion_version
      es_padre
      id_grupo_version
      id_presupuesto_base
      id_presupuesto_licitacion
      version_licitacion_aprobada
      estado
      estado_aprobacion {
        tipo
        estado
        id_aprobacion
      }
      es_inmutable
      es_activo
    }
  }
`;

export const GET_PRESUPUESTO_QUERY = `
  query GetPresupuesto($id_presupuesto: String!) {
    getPresupuesto(id_presupuesto: $id_presupuesto) {
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
      fase
      version
      descripcion_version
      es_padre
      id_grupo_version
      id_presupuesto_base
      id_presupuesto_licitacion
      version_licitacion_aprobada
      estado
      estado_aprobacion {
        tipo
        estado
        id_aprobacion
      }
      es_inmutable
      es_activo
    }
  }
`;

export const LIST_PRESUPUESTOS_QUERY = `
  query ListPresupuestos {
    listPresupuestos {
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
      fase
      version
      descripcion_version
      es_padre
      id_grupo_version
      id_presupuesto_base
      id_presupuesto_licitacion
      version_licitacion_aprobada
      estado
      estado_aprobacion {
        tipo
        estado
        id_aprobacion
      }
      es_inmutable
      es_activo
    }
  }
`;

export const GET_PRESUPUESTOS_POR_FASE_QUERY = `
  query GetPresupuestosPorFaseYEstado($fase: FasePresupuesto!, $estado: EstadoPresupuesto, $id_proyecto: String) {
    getPresupuestosPorFaseYEstado(fase: $fase, estado: $estado, id_proyecto: $id_proyecto) {
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
      fase
      version
      descripcion_version
      es_padre
      id_grupo_version
      id_presupuesto_base
      id_presupuesto_licitacion
      version_licitacion_aprobada
      estado
      estado_aprobacion {
        tipo
        estado
        id_aprobacion
      }
      es_inmutable
      es_activo
    }
  }
`;

// La jerarquía se construye en el frontend usando id_titulo_padre e id_partida_padre
export const GET_ESTRUCTURA_PRESUPUESTO_QUERY = `
  query GetEstructuraPresupuesto($id_presupuesto: String!) {
    getEstructuraPresupuesto(id_presupuesto: $id_presupuesto) {
      presupuesto {
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
        fase
        version
        descripcion_version
        es_padre
        id_grupo_version
        estado
        estado_aprobacion {
          tipo
          estado
          id_aprobacion
        }
        es_inmutable
        es_activo
      }
      titulos {
        _id
        id_titulo
        id_presupuesto
        id_proyecto
        id_titulo_padre
        nivel
        numero_item
        descripcion
        tipo
        orden
        total_parcial
        id_especialidad
      }
      partidas {
        _id
        id_partida
        id_presupuesto
        id_proyecto
        id_titulo
        id_partida_padre
        nivel_partida
        numero_item
        descripcion
        unidad_medida
        metrado
        precio_unitario
        parcial_partida
        orden
        estado
      }
    }
  }
`;
