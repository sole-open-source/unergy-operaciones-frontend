// Fuente de verdad de los "enums" del dominio de seguimiento de conexion XM (GD/AGGE):
// etapas, estados, hitos 1a-8c + pesos, responsables y tipos de alerta.
// Portado (sin cambios de logica) desde el nucleo probado del feature MDC.

export const Etapa = {
  ETAPA_1_CREG174_AMBITO: 'ETAPA_1_CREG174_AMBITO',
  ETAPA_2_CARTAS_9_1_9_7: 'ETAPA_2_CARTAS_9_1_9_7',
  ETAPA_3_MDC: 'ETAPA_3_MDC',
  ETAPA_4_MONTAJE_9_2: 'ETAPA_4_MONTAJE_9_2',
  ETAPA_5_REQ_9_3: 'ETAPA_5_REQ_9_3',
  ETAPA_6_FRONTERA: 'ETAPA_6_FRONTERA',
  ETAPA_7_REGISTRO_ASIC: 'ETAPA_7_REGISTRO_ASIC',
  ETAPA_8_REQ_9_4: 'ETAPA_8_REQ_9_4',
  // Futuras (previstas, sin logica ni UI de seguimiento)
  CONSTRUCCION: 'CONSTRUCCION',
  INTERVENTORIA_PROTECCIONES: 'INTERVENTORIA_PROTECCIONES',
  ENERGIZACION: 'ENERGIZACION',
  CARTA_9_5: 'CARTA_9_5',
  REQUISITO_9_6: 'REQUISITO_9_6',
  PRUEBAS_GENERACION: 'PRUEBAS_GENERACION',
  CARTA_9_9: 'CARTA_9_9',
}

export const ETAPAS_ACTUALES = [
  Etapa.ETAPA_1_CREG174_AMBITO,
  Etapa.ETAPA_2_CARTAS_9_1_9_7,
  Etapa.ETAPA_3_MDC,
  Etapa.ETAPA_4_MONTAJE_9_2,
  Etapa.ETAPA_5_REQ_9_3,
  Etapa.ETAPA_6_FRONTERA,
  Etapa.ETAPA_7_REGISTRO_ASIC,
  Etapa.ETAPA_8_REQ_9_4,
]

export const ETAPAS_FUTURAS = [
  Etapa.CONSTRUCCION,
  Etapa.INTERVENTORIA_PROTECCIONES,
  Etapa.ENERGIZACION,
  Etapa.CARTA_9_5,
  Etapa.REQUISITO_9_6,
  Etapa.PRUEBAS_GENERACION,
  Etapa.CARTA_9_9,
]

export const ETIQUETAS_ETAPA = {
  ETAPA_1_CREG174_AMBITO: '1. CREG 174 y ámbito de conexión',
  ETAPA_2_CARTAS_9_1_9_7: '2. Cartas 9.1 y 9.7 (OR)',
  ETAPA_3_MDC: '3. Creación en el aplicativo MDC (XM)',
  ETAPA_4_MONTAJE_9_2: '4. Montaje 9.1/9.7 y carta 9.2',
  ETAPA_5_REQ_9_3: '5. Requisito 9.3 (parámetros técnicos)',
  ETAPA_6_FRONTERA: '6. Documentación y equipos de frontera',
  ETAPA_7_REGISTRO_ASIC: '7. Registro de frontera (ASIC) y códigos FRT',
  ETAPA_8_REQ_9_4: '8. Requisito 9.4 (protecciones)',
  CONSTRUCCION: 'Construcción',
  INTERVENTORIA_PROTECCIONES: 'Interventoría y protecciones',
  ENERGIZACION: 'Energización',
  CARTA_9_5: 'Carta 9.5 (equipos a conectar)',
  REQUISITO_9_6: 'Requisito 9.6 (envío códigos FRT)',
  PRUEBAS_GENERACION: 'Pruebas de generación',
  CARTA_9_9: 'Carta 9.9 (inicio de operación y cierre)',
}

export const Estado = {
  NO_INICIADO: 'NO_INICIADO',
  SOLICITUD_RADICADA: 'SOLICITUD_RADICADA',
  CREG174_APROBADA: 'CREG174_APROBADA',
  AMBITO_EMITIDO: 'AMBITO_EMITIDO',
  PRORROGA_SOLICITADA: 'PRORROGA_SOLICITADA',
  PRORROGADO: 'PRORROGADO',
  CARTAS_EN_PREPARACION: 'CARTAS_EN_PREPARACION',
  SOLICITUD_ENVIADA_OR: 'SOLICITUD_ENVIADA_OR',
  EN_FIRMA_OR: 'EN_FIRMA_OR',
  OBSERVACIONES_OR: 'OBSERVACIONES_OR',
  CARTAS_FIRMADAS: 'CARTAS_FIRMADAS',
  SOLICITUD_ENVIADA_XM: 'SOLICITUD_ENVIADA_XM',
  EN_CREACION_XM: 'EN_CREACION_XM',
  APLICATIVO_CREADO: 'APLICATIVO_CREADO',
  CARTAS_MONTADAS_MDC: 'CARTAS_MONTADAS_MDC',
  CARTA_9_2_ENVIADA: 'CARTA_9_2_ENVIADA',
  CARTA_9_2_ACEPTADA: 'CARTA_9_2_ACEPTADA',
  RECOPILANDO_INSUMOS: 'RECOPILANDO_INSUMOS',
  EN_DILIGENCIAMIENTO: 'EN_DILIGENCIAMIENTO',
  MONTADO_MDC: 'MONTADO_MDC',
  ACEPTADO_XM: 'ACEPTADO_XM',
  EQUIPOS_SOLICITADOS: 'EQUIPOS_SOLICITADOS',
  EQUIPOS_EN_LABORATORIO_QUOIA: 'EQUIPOS_EN_LABORATORIO_QUOIA',
  EQUIPOS_PARAMETRIZADOS: 'EQUIPOS_PARAMETRIZADOS',
  DOCUMENTACION_EN_RECOPILACION: 'DOCUMENTACION_EN_RECOPILACION',
  DOCUMENTACION_COMPLETA: 'DOCUMENTACION_COMPLETA',
  EN_VERIFICACION_TERCERO: 'EN_VERIFICACION_TERCERO',
  INSCRITA_ASIC: 'INSCRITA_ASIC',
  CGM_ASIGNADO: 'CGM_ASIGNADO',
  CODIGO_FRT_ASIGNADO: 'CODIGO_FRT_ASIGNADO',
  FRONTERA_EN_OPERACION: 'FRONTERA_EN_OPERACION',
  ESPERANDO_VISITA_PROTECCIONES: 'ESPERANDO_VISITA_PROTECCIONES',
  VALORES_RECIBIDOS: 'VALORES_RECIBIDOS',
  CARTA_SOLICITADA_OR: 'CARTA_SOLICITADA_OR',
  FIRMADA_OR: 'FIRMADA_OR',
  MONTADA_MDC: 'MONTADA_MDC',
  APROBADA_XM: 'APROBADA_XM',
  OBSERVACIONES_XM: 'OBSERVACIONES_XM',
  VENCIDO: 'VENCIDO',
  BLOQUEADO: 'BLOQUEADO',
  EN_OBRA: 'EN_OBRA',
  TERMINADA: 'TERMINADA',
  EN_REVISION: 'EN_REVISION',
  NO_CONFORMIDADES: 'NO_CONFORMIDADES',
  CERRADA: 'CERRADA',
  SOLICITADA: 'SOLICITADA',
  APROBADA: 'APROBADA',
  ENVIADO: 'ENVIADO',
  CONFIRMADO: 'CONFIRMADO',
  EN_PRUEBAS: 'EN_PRUEBAS',
  CERRADO: 'CERRADO',
}

export const Hito = {
  H_1A: 'H_1A', H_1B: 'H_1B', H_2A: 'H_2A', H_2B: 'H_2B',
  H_3A: 'H_3A', H_3B: 'H_3B', H_4: 'H_4', H_5: 'H_5',
  H_6A: 'H_6A', H_6B: 'H_6B', H_7: 'H_7',
  H_8A: 'H_8A', H_8B: 'H_8B', H_8C: 'H_8C',
}

// Catalogo de hitos con su peso POR DEFECTO (recalibrable). Suma = 100%.
export const HITOS = [
  { key: Hito.H_1A, codigo: '1a', etapa: Etapa.ETAPA_1_CREG174_AMBITO, pesoDefault: 8, descripcion: 'CREG 174 (factibilidad) aprobada' },
  { key: Hito.H_1B, codigo: '1b', etapa: Etapa.ETAPA_1_CREG174_AMBITO, pesoDefault: 7, descripcion: 'Ámbito de conexión emitido (punto exacto)' },
  { key: Hito.H_2A, codigo: '2a', etapa: Etapa.ETAPA_2_CARTAS_9_1_9_7, pesoDefault: 5, descripcion: 'Solicitud de cartas 9.1 y 9.7 enviada al OR' },
  { key: Hito.H_2B, codigo: '2b', etapa: Etapa.ETAPA_2_CARTAS_9_1_9_7, pesoDefault: 10, descripcion: 'Cartas 9.1 y 9.7 firmadas por el OR' },
  { key: Hito.H_3A, codigo: '3a', etapa: Etapa.ETAPA_3_MDC, pesoDefault: 3, descripcion: 'Solicitud a XM de creación en el aplicativo MDC' },
  { key: Hito.H_3B, codigo: '3b', etapa: Etapa.ETAPA_3_MDC, pesoDefault: 7, descripcion: 'Proyecto creado en el aplicativo MDC' },
  { key: Hito.H_4, codigo: '4', etapa: Etapa.ETAPA_4_MONTAJE_9_2, pesoDefault: 5, descripcion: 'Cartas 9.1/9.7 montadas + carta 9.2 diligenciada y aceptada' },
  { key: Hito.H_5, codigo: '5', etapa: Etapa.ETAPA_5_REQ_9_3, pesoDefault: 10, descripcion: 'Requisito 9.3 diligenciado, montado y aceptado por XM' },
  { key: Hito.H_6A, codigo: '6a', etapa: Etapa.ETAPA_6_FRONTERA, pesoDefault: 5, descripcion: 'Documentación de frontera solicitada (Solenium)' },
  { key: Hito.H_6B, codigo: '6b', etapa: Etapa.ETAPA_6_FRONTERA, pesoDefault: 10, descripcion: 'Documentación de frontera completa (equipos parametrizados en Quoia)' },
  { key: Hito.H_7, codigo: '7', etapa: Etapa.ETAPA_7_REGISTRO_ASIC, pesoDefault: 15, descripcion: 'Frontera registrada ante el ASIC + códigos FRT recibidos' },
  { key: Hito.H_8A, codigo: '8a', etapa: Etapa.ETAPA_8_REQ_9_4, pesoDefault: 3, descripcion: 'Carta 9.4 solicitada (tras visita de protecciones)' },
  { key: Hito.H_8B, codigo: '8b', etapa: Etapa.ETAPA_8_REQ_9_4, pesoDefault: 5, descripcion: 'Carta 9.4 firmada por el OR' },
  { key: Hito.H_8C, codigo: '8c', etapa: Etapa.ETAPA_8_REQ_9_4, pesoDefault: 7, descripcion: 'Carta 9.4 montada en el MDC y aprobada por XM' },
]

export const HITOS_POR_KEY = Object.fromEntries(HITOS.map((h) => [h.key, h]))

export const Responsable = {
  PROMOTOR: 'PROMOTOR', OR: 'OR', XM: 'XM', ASIC: 'ASIC', SOLENIUM: 'SOLENIUM', QUOIA: 'QUOIA',
}

export const TipoAlerta = {
  VENCIMIENTO_VIGENCIA: 'VENCIMIENTO_VIGENCIA',
  EQUIPOS_FRONTERA_90D: 'EQUIPOS_FRONTERA_90D',
  MEDIDOR_OR_15DH: 'MEDIDOR_OR_15DH',
  ETAPA_ESTANCADA: 'ETAPA_ESTANCADA',
  CALIBRACION_POR_VENCER: 'CALIBRACION_POR_VENCER',
}
