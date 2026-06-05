// ──────────────────────────────────────────────────────────────────────────
// Catálogos y etiquetas compartidos del módulo de Liquidaciones.
// Fuente única de verdad — antes estaban duplicados en 4 vistas.
// Estos valores reflejan los enums del backend (ver /liquidaciones/catalogos/tipos).
// ──────────────────────────────────────────────────────────────────────────

// Estados del workflow de una liquidación (en orden del pipeline)
export const ESTADOS_LIQUIDACION = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]

// Etiqueta legible por humanos para cada estado
export const ESTADO_LABEL = {
  iniciada: 'Iniciada',
  costos_registrados: 'Costos registrados',
  xm_procesado: 'XM procesado',
  mandatos_emitidos: 'Mandatos emitidos',
  en_contabilidad: 'En contabilidad',
  en_revisoria: 'En revisoría',
  facturado: 'Facturado',
  entregado: 'Entregado',
}

// Severidad de PrimeVue Tag por estado
export const ESTADO_SEVERITY = {
  iniciada: 'secondary', costos_registrados: 'info', xm_procesado: 'info',
  mandatos_emitidos: 'warn', en_contabilidad: 'warn', en_revisoria: 'warn',
  facturado: 'success', entregado: 'contrast',
}

// Color hex por estado (para barras de pipeline / gráficos)
export const ESTADO_COLOR = {
  iniciada: '#9b8fb0', costos_registrados: '#3B82F6', xm_procesado: '#06B6D4',
  mandatos_emitidos: '#F59E0B', en_contabilidad: '#D97706', en_revisoria: '#CA8A04',
  facturado: '#10B981', entregado: '#915BD8',
}

export const TIPOS_VENTA = ['bolsa', 'ppa', 'interno', 'autoconsumo']

// Clasificación de proyecto (pestañas Todos / Minigranjas / Autoconsumo)
export const TIPOS_PROYECTO_TABS = [
  { key: 'todos', label: 'Todos', filter: null },
  { key: 'minigranja', label: 'Minigranjas', filter: 'minigranja' },
  { key: 'autoconsumo', label: 'Autoconsumo', filter: 'autoconsumo' },
]

// Tipos de línea de mandato
export const TIPOS_LINEA_INGRESOS = [
  'ingreso_bruto', 'ajuste_xm', 'ajuste_unergy', 'ajuste_comercializacion',
  'intereses', 'otro_ingreso', 'despacho', 'ventas_en_bolsa',
  'compras_en_bolsa', 'redistribucion_ingresos', 'valor_a_pagar',
]
export const TIPOS_LINEA_COSTOS = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
  'comercializacion', 'representacion', 'cgm', 'administracion',
  'iva', 'retencion_fuente', 'reteica', 'ica_opex', 'otro_impuesto',
]

export const TIPOS_COSTO = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
]

export const TIPOS_SERVICIO = [
  { label: 'Representación', value: 'representacion' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Administración Operación', value: 'administracion_operacion' },
  { label: 'Otro', value: 'otro' },
]

// Etiquetas legibles de tipos de línea de mandato
export const ETIQUETAS = {
  ingreso_bruto: 'Ingreso Bruto', ajuste_xm: 'Ajuste Xm',
  ajuste_unergy: 'Ajuste Unergy', ajuste_comercializacion: 'Comercialización',
  intereses: 'Intereses', otro_ingreso: 'Otro Ingreso', despacho: 'Despacho',
  ventas_en_bolsa: 'Ventas en Bolsa', compras_en_bolsa: 'Compras en Bolsa',
  redistribucion_ingresos: 'Redistribución de Ingresos de acuerdo al Protocolo',
  mantenimiento: 'Mantenimiento', arriendo: 'Arriendo',
  servicio_internet: 'Servicio de Internet', poliza_cumplimiento: 'Póliza de Cumplimiento',
  servicios_publicos_consumo: 'Servicios Públicos Consumo de energía',
  cambio_equipos_medida: 'Cambio Equipos de Medida', seguro: 'Seguro',
  otro_costo: 'Otro Costo', comercializacion: 'Comercialización',
  representacion: 'Representación', cgm: 'CGM', administracion: 'Administración',
  iva: 'IVA', retencion_fuente: 'Retención en la Fuente', reteica: 'Reteica',
  ica_opex: 'ICA OPEX', otro_impuesto: 'Otro Impuesto', valor_a_pagar: 'Valor a Pagar',
}

export const LABEL_SERVICIO = {
  representacion: 'Representación', cgm: 'CGM',
  administracion_operacion: 'Administración', otro: 'Otro',
}

// Clasificación de líneas para el cálculo del estado de resultados
export const TIPOS_INGRESO_BRUTO = new Set([
  'ingreso_bruto', 'despacho', 'ventas_en_bolsa', 'redistribucion_ingresos',
])
export const TIPOS_COMERCIALIZACION = new Set([
  'ajuste_comercializacion', 'comercializacion', 'compras_en_bolsa',
])
