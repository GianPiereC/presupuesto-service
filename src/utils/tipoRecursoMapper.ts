/**
 * Utilidades para mapear tipos de recurso del API externo al enum TipoRecursoApu
 */

export type TipoRecursoApu = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';

/**
 * Mapea el tipo_costo_recurso del API externo al enum TipoRecursoApu
 */
export function mapearTipoCostoRecursoATipoApu(
  nombreTipoCostoRecurso?: string,
  codigoTipoCostoRecurso?: string
): TipoRecursoApu {
  const nombre = nombreTipoCostoRecurso?.trim().toUpperCase() || '';
  const codigo = codigoTipoCostoRecurso?.trim().toUpperCase() || '';
  
  // Mapeo por código (más confiable)
  const mapeoPorCodigo: Record<string, TipoRecursoApu> = {
    'MAT': 'MATERIAL',
    'MO': 'MANO_OBRA',
    'EQ': 'EQUIPO',
    'SC': 'SUBCONTRATO'
  };
  
  if (codigo && mapeoPorCodigo[codigo]) {
    return mapeoPorCodigo[codigo];
  }
  
  // Mapeo por nombre (fallback)
  const mapeoPorNombre: Record<string, TipoRecursoApu> = {
    'MATERIALES': 'MATERIAL',
    'MATERIAL': 'MATERIAL',
    'MANO DE OBRA': 'MANO_OBRA',
    'MANO_OBRA': 'MANO_OBRA',
    'EQUIPO': 'EQUIPO',
    'SUB-CONTRATOS': 'SUBCONTRATO',
    'SUBCONTRATO': 'SUBCONTRATO',
    'SUBCONTRATOS': 'SUBCONTRATO'
  };
  
  if (nombre && mapeoPorNombre[nombre]) {
    return mapeoPorNombre[nombre];
  }
  
  // Por defecto, retornar MATERIAL
  console.warn(
    `Tipo de costo recurso no reconocido: nombre="${nombreTipoCostoRecurso}", codigo="${codigoTipoCostoRecurso}". ` +
    `Usando MATERIAL por defecto.`
  );
  return 'MATERIAL';
}

/**
 * Valida si un tipo de recurso es válido para APU
 */
export function esTipoValidoParaApu(
  nombreTipoCostoRecurso?: string,
  codigoTipoCostoRecurso?: string
): boolean {
  const nombre = nombreTipoCostoRecurso?.trim().toUpperCase() || '';
  const codigo = codigoTipoCostoRecurso?.trim().toUpperCase() || '';
  
  const tiposInvalidos = ['SUB-PARTIDAS', 'SP', 'OTROS', '-'];
  
  return !tiposInvalidos.includes(nombre) && !tiposInvalidos.includes(codigo);
}

