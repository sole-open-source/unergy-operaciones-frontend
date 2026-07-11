// ── Accesibilidad: utilidades de validación ────────────────────────────────
// Funciones puras (sin dependencias del framework) para verificar contraste de
// color, atributos ARIA y enfocabilidad. Se usan en las pruebas (test/a11y.spec.js)
// y pueden invocarse en desarrollo para auditar el DOM en vivo.

/** Convierte "#RGB" o "#RRGGBB" a `{ r, g, b }` (0-255). */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Luminancia relativa (WCAG 2.1) a partir de `{ r, g, b }`. */
export function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Relación de contraste entre dos colores (hex). Rango 1..21.
 * @returns {number} p.ej. 4.54
 */
export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  if (!a || !b) return NaN
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * ¿Cumple el par de colores el mínimo WCAG?
 * @param {'AA'|'AAA'} level
 * @param {boolean} largeText texto grande (>=18.66px bold o >=24px normal)
 */
export function meetsContrast(hexA, hexB, level = 'AA', largeText = false) {
  const ratio = contrastRatio(hexA, hexB)
  if (Number.isNaN(ratio)) return false
  const thresholds = {
    AA: largeText ? 3 : 4.5,
    AAA: largeText ? 4.5 : 7,
  }
  return ratio >= (thresholds[level] ?? 4.5)
}

// ── Validaciones sobre el DOM ──────────────────────────────────────────────

/** Escapa un id para usarlo en un selector CSS (con fallback si no hay CSS.escape). */
function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

/**
 * Revisa que cada control de formulario tenga un nombre accesible
 * (label asociado, aria-label o aria-labelledby).
 * @returns {Array<{ el: Element, reason: string }>} elementos sin nombre
 */
export function findUnlabeledControls(root = document) {
  const controls = root.querySelectorAll('input, select, textarea')
  const problems = []
  controls.forEach((el) => {
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (type === 'hidden' || el.hasAttribute('aria-hidden')) return
    const id = el.getAttribute('id')
    const hasLabelFor = id && root.querySelector(`label[for="${cssEscape(id)}"]`)
    const hasWrappingLabel = el.closest('label')
    const hasAriaLabel = el.getAttribute('aria-label')?.trim()
    const hasAriaLabelledby = el.getAttribute('aria-labelledby')?.trim()
    const hasTitle = el.getAttribute('title')?.trim()
    if (!hasLabelFor && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      problems.push({ el, reason: 'control sin nombre accesible' })
    }
  })
  return problems
}

/** Revisa que cada <img> tenga `alt` (o `role="presentation"`/`alt=""`). */
export function findImagesWithoutAlt(root = document) {
  const problems = []
  root.querySelectorAll('img').forEach((img) => {
    const role = img.getAttribute('role')
    if (role === 'presentation' || role === 'none') return
    if (!img.hasAttribute('alt')) problems.push({ el: img, reason: 'img sin atributo alt' })
  })
  return problems
}

/** Revisa botones/enlaces sin texto ni etiqueta accesible (solo íconos). */
export function findIconOnlyControlsWithoutLabel(root = document) {
  const problems = []
  root.querySelectorAll('button, a[href], [role="button"]').forEach((el) => {
    const text = (el.textContent || '').trim()
    const hasAria = el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')?.trim()
    const hasTitle = el.getAttribute('title')?.trim()
    if (!text && !hasAria && !hasTitle) {
      problems.push({ el, reason: 'control interactivo sin nombre accesible' })
    }
  })
  return problems
}

// Roles ARIA válidos usados en la app (subconjunto de la spec WAI-ARIA 1.2).
const VALID_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
  'contentinfo', 'dialog', 'document', 'feed', 'figure', 'form', 'grid',
  'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
  'listitem', 'log', 'main', 'menu', 'menubar', 'menuitem', 'navigation',
  'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
  'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'search',
  'searchbox', 'separator', 'slider', 'status', 'switch', 'tab', 'table',
  'tablist', 'tabpanel', 'textbox', 'toolbar', 'tooltip', 'tree', 'treeitem',
])

/** ¿Es `role` un rol ARIA válido? */
export function isValidRole(role) {
  return VALID_ROLES.has(String(role || '').trim())
}

/** Detecta atributos `role` inválidos en el subárbol. */
export function findInvalidRoles(root = document) {
  const problems = []
  root.querySelectorAll('[role]').forEach((el) => {
    const role = el.getAttribute('role')
    if (!isValidRole(role)) problems.push({ el, reason: `rol ARIA inválido: "${role}"` })
  })
  return problems
}

/**
 * Auditoría rápida y ligera del DOM: agrupa las verificaciones anteriores.
 * No sustituye a axe-core, pero sirve como comprobación en caliente y en tests
 * sin depender de un navegador real.
 * @returns {{ ok: boolean, issues: Array<{ rule: string, el: Element, reason: string }> }}
 */
export function auditDom(root = document) {
  const issues = []
  const push = (rule, list) => list.forEach((p) => issues.push({ rule, ...p }))
  push('label', findUnlabeledControls(root))
  push('image-alt', findImagesWithoutAlt(root))
  push('button-name', findIconOnlyControlsWithoutLabel(root))
  push('aria-role', findInvalidRoles(root))
  return { ok: issues.length === 0, issues }
}
