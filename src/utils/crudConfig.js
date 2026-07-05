import { rules } from '@/composables/useFormValidation'

/**
 * Configuración centralizada por entidad para el sistema CRUD reutilizable
 * (useCrudManager + BaseDataTable + BaseFilterBar + BaseFormLayout).
 *
 * Cada entrada define:
 *   endpoint    → ruta del backend (baseURL `/api/v1`, ver `@/api/client`).
 *   lazy        → true si el backend pagina en servidor ({ items, total }).
 *   columns     → columnas para BaseDataTable (celdas complejas se resuelven con slots).
 *   filters     → campos para BaseFilterBar.
 *   formFields  → campos para BaseFormLayout.
 *   validation  → esquema de reglas para useFormValidation.
 *
 * Añadir una entidad nueva = añadir un objeto aquí, sin escribir Vue nuevo.
 */

export const clientesConfig = {
  endpoint: '/clientes',
  lazy: true,
  pageSize: 20,
  columns: [
    { field: 'razon_social_nombre', header: 'Razón social / Nombre', sortable: true },
    { field: 'nit_cedula', header: 'NIT / Cédula' },
    { field: 'tipo_persona', header: 'Tipo' },
    { field: 'ciudad', header: 'Ciudad' },
    { field: 'correo_electronico', header: 'Correo' },
  ],
  filters: [
    { key: 'q', type: 'text', placeholder: 'Buscar...', width: 'w-full sm:w-64' },
  ],
  validation: {
    razon_social_nombre: [rules.required('La razón social / nombre es obligatoria')],
    correo_electronico: [rules.email()],
    correo_liquidacion: [rules.email()],
    correo_monitoreo: [rules.email()],
    correo_soporte: [rules.email()],
  },
}

export const proyectosConfig = {
  endpoint: '/proyectos',
  lazy: false, // la vista carga todo (size grande) y agrupa por tipo en cliente
  pageSize: 200,
  estados: ['en_desarrollo', 'en_operacion', 'suspendido', 'cancelado'],
  tipos: ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro'],
  filters: [
    { key: 'q', type: 'text', label: 'Buscar', placeholder: 'Nombre comercial…', width: 'w-56' },
    { key: 'estado', type: 'select', label: 'Estado', options: ['en_desarrollo', 'en_operacion', 'suspendido', 'cancelado'], width: 'w-40' },
    { key: 'tipo_proyecto', type: 'select', label: 'Tipo', options: ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro'], width: 'w-44' },
  ],
  validation: {
    nombre_comercial: [rules.required('El nombre comercial es obligatorio')],
  },
}

export const contratosConfig = {
  // La vista de Contratos maneja varios servicios con endpoints distintos.
  endpoints: {
    ppa: '/ppa',
    servicio: '/contratos-servicio',
    representacion: '/proyectos',
  },
  lazy: false,
  columns: {
    ppa: [
      { field: 'nombre_interno', header: 'Nombre interno', sortable: true, slot: true },
      { field: 'tipo_contrato', header: 'Tipo', sortable: true, style: 'width:90px', slot: true },
      { field: 'numero_codigo_contrato', header: 'N° contrato', sortable: true, style: 'width:160px', slot: true },
    ],
  },
}

export const fallasConfig = {
  endpoint: '/fallas',
  lazy: true,
  pageSize: 20,
  columns: [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'proyecto_nombre', header: 'Proyecto' },
    { field: 'tipo', header: 'Tipo' },
    { field: 'estado', header: 'Estado', slot: true },
    { field: 'fecha_reporte', header: 'Reporte', sortable: true },
  ],
  filters: [
    { key: 'q', type: 'text', placeholder: 'Buscar falla...', width: 'w-64' },
    { key: 'estado', type: 'select', label: 'Estado', options: ['abierta', 'en_proceso', 'resuelta', 'cerrada'] },
  ],
}

export default {
  clientes: clientesConfig,
  proyectos: proyectosConfig,
  contratos: contratosConfig,
  fallas: fallasConfig,
}
