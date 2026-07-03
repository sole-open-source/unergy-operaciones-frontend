// ─────────────────────────────────────────────────────────────────────────────
// Modelo de permisos (RBAC) — fuente de verdad para la lógica de UI.
//
// La plataforma autentica con un JWT que contiene un único `rol` (string). Este
// archivo deriva, a partir de ese rol, un conjunto de permisos de grano fino que
// las vistas, directivas y guards del router consultan. Así se centraliza en un
// solo lugar "qué puede hacer cada rol", sin depender de que el backend envíe
// una lista explícita de permisos (aunque el store también admite una lista
// explícita si en el futuro el backend la entrega — ver permissionStore.js).
// ─────────────────────────────────────────────────────────────────────────────

// Rol con acceso total (super-usuario). Coincide con la semántica de
// `useAuthStore().can()`, donde 'admin' siempre pasa.
export const ADMIN_ROLE = 'admin'

/** Catálogo de permisos disponibles. Formato: `<dominio>.<acción>`. */
export const PERMISSIONS = {
  // Proyectos
  PROJECTS_VIEW:   'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT:   'projects.edit',
  PROJECTS_DELETE: 'projects.delete',

  // Clientes
  CLIENTS_VIEW:    'clients.view',
  CLIENTS_CREATE:  'clients.create',
  CLIENTS_EDIT:    'clients.edit',
  CLIENTS_DELETE:  'clients.delete',

  // Finanzas (liquidaciones, costos, panel contable, garantías, arriendos…)
  FINANZAS_VIEW:   'finanzas.view',
  FINANZAS_EDIT:   'finanzas.edit',

  // Operaciones (informes, control de generación, solar live, costos variables)
  OPERACIONES_VIEW: 'operaciones.view',
  OPERACIONES_EDIT: 'operaciones.edit',

  // Gestión de fallas / monitoreo
  FALLAS_VIEW:     'fallas.view',
  FALLAS_EDIT:     'fallas.edit',

  // MEM / Fronteras Comerciales / Comercialización
  MEM_VIEW:        'mem.view',

  // Alertas
  ALERTAS_VIEW:    'alertas.view',

  // Administración
  ADMIN_USERS:     'admin.users',
}

// Lista plana de todos los permisos (útil para el super-usuario).
export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS))

const P = PERMISSIONS

// ─────────────────────────────────────────────────────────────────────────────
// Mapa Rol → permisos. Los roles corresponden a los que emite el backend en el
// JWT (`rol`): admin, operaciones, monitoreo, liquidaciones, coordinador,
// tecnico. `admin` no se lista aquí porque es super-usuario (ver hasPermission).
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = Object.freeze({
  // Gestión operativa del portafolio + operaciones + fronteras + usuarios.
  operaciones: [
    P.PROJECTS_VIEW, P.PROJECTS_CREATE, P.PROJECTS_EDIT, P.PROJECTS_DELETE,
    P.CLIENTS_VIEW,  P.CLIENTS_CREATE,  P.CLIENTS_EDIT,  P.CLIENTS_DELETE,
    P.OPERACIONES_VIEW, P.OPERACIONES_EDIT,
    P.FALLAS_VIEW, P.FALLAS_EDIT,
    P.MEM_VIEW, P.ALERTAS_VIEW, P.ADMIN_USERS,
  ],

  // Perfil de solo lectura sobre operación y monitoreo.
  monitoreo: [
    P.PROJECTS_VIEW, P.CLIENTS_VIEW,
    P.OPERACIONES_VIEW, P.FALLAS_VIEW,
    P.MEM_VIEW, P.ALERTAS_VIEW,
  ],

  // Perfil financiero: liquidaciones, costos, panel contable, garantías.
  liquidaciones: [
    P.PROJECTS_VIEW, P.CLIENTS_VIEW,
    P.FINANZAS_VIEW, P.FINANZAS_EDIT,
    P.ALERTAS_VIEW,
  ],

  // Perfiles móviles (PWA) — enfocados en gestión de fallas en campo.
  coordinador: [P.FALLAS_VIEW, P.FALLAS_EDIT],
  tecnico:     [P.FALLAS_VIEW, P.FALLAS_EDIT],
})

/**
 * Devuelve el conjunto de permisos para un rol dado.
 * `admin` obtiene todos los permisos (super-usuario).
 */
export function permissionsForRole(role) {
  if (!role) return []
  if (role === ADMIN_ROLE) return [...ALL_PERMISSIONS]
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : []
}
