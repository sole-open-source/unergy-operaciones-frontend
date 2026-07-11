import { onBeforeUnmount, ref } from 'vue'

// ── Accesibilidad: gestión de foco de teclado ──────────────────────────────
// Utilidades para atrapar el foco dentro de un contenedor (modales/diálogos),
// restaurarlo al cerrar, y anunciar cambios a lectores de pantalla mediante una
// región "live". Todo es agnóstico a PrimeVue: opera sobre nodos del DOM.

// Selector de todo lo que puede recibir foco por teclado dentro de un contenedor.
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/** Devuelve los elementos enfocables *visibles* dentro de `container`. */
export function getFocusable(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
    // Descartar elementos ocultos (aria-hidden, [hidden], display/visibility).
    if (el.getAttribute('aria-hidden') === 'true') return false
    if (el.closest('[aria-hidden="true"]')) return false
    if (el.hasAttribute('hidden') || el.closest('[hidden]')) return false
    // Ocultos por CSS: solo si hay motor de layout/estilos (en un navegador
    // real). Bajo jsdom no hay layout, así que no filtramos por geometría.
    const style = typeof window !== 'undefined' && window.getComputedStyle
      ? window.getComputedStyle(el)
      : null
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false
    return true
  })
}

// ── Región "live" única y compartida para anuncios ─────────────────────────
// Un solo <div aria-live> reutilizable evita crear/destruir nodos y garantiza
// que los lectores de pantalla lo tengan "vigilado" desde el arranque.
let liveRegion = null

function ensureLiveRegion() {
  if (typeof document === 'undefined') return null
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion
  liveRegion = document.createElement('div')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.setAttribute('role', 'status')
  liveRegion.className = 'sr-only'
  liveRegion.id = 'a11y-live-region'
  document.body.appendChild(liveRegion)
  return liveRegion
}

/**
 * Anuncia `message` a lectores de pantalla.
 * @param {string} message
 * @param {'polite'|'assertive'} [priority='polite']
 */
export function announce(message, priority = 'polite') {
  const region = ensureLiveRegion()
  if (!region || !message) return
  region.setAttribute('aria-live', priority)
  // Limpiar y reponer en el siguiente frame para forzar la relectura aunque el
  // texto sea idéntico al anterior.
  region.textContent = ''
  window.requestAnimationFrame(() => {
    region.textContent = String(message)
  })
}

/** Mueve el foco a `el`; si no es enfocable, lo hace enfocable temporalmente. */
export function focusElement(el) {
  if (!el) return
  if (!el.hasAttribute('tabindex') && !el.matches(FOCUSABLE)) {
    el.setAttribute('tabindex', '-1')
  }
  el.focus({ preventScroll: false })
}

/**
 * Atrapa el foco dentro de `getContainer()` mientras esté activo.
 * Devuelve `{ activate, deactivate }`. Restaura el foco al elemento previo al
 * desactivar. Pensado para modales/diálogos.
 *
 * @param {() => (HTMLElement|null)} getContainer
 * @param {{ initialFocus?: () => (HTMLElement|null), restoreFocus?: boolean }} [opts]
 */
export function useFocusTrap(getContainer, opts = {}) {
  const { restoreFocus = true } = opts
  const active = ref(false)
  let previouslyFocused = null

  function onKeydown(e) {
    if (e.key !== 'Tab') return
    const container = getContainer()
    if (!container) return
    const items = getFocusable(container)
    if (items.length === 0) {
      // Sin nada enfocable: mantener el foco en el contenedor.
      e.preventDefault()
      focusElement(container)
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const activeEl = document.activeElement

    if (e.shiftKey) {
      if (activeEl === first || !container.contains(activeEl)) {
        e.preventDefault()
        last.focus()
      }
    } else if (activeEl === last || !container.contains(activeEl)) {
      e.preventDefault()
      first.focus()
    }
  }

  function activate() {
    if (active.value) return
    previouslyFocused = document.activeElement
    active.value = true
    document.addEventListener('keydown', onKeydown, true)
    // Enfocar el objetivo inicial tras el render.
    window.requestAnimationFrame(() => {
      const container = getContainer()
      if (!container) return
      const target = opts.initialFocus?.() || getFocusable(container)[0] || container
      focusElement(target)
    })
  }

  function deactivate() {
    if (!active.value) return
    active.value = false
    document.removeEventListener('keydown', onKeydown, true)
    if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  onBeforeUnmount(deactivate)

  return { active, activate, deactivate }
}

/**
 * Habilita navegación por flechas (roving tabindex) dentro de una lista.
 * `orientation` controla si responde a arriba/abajo o izquierda/derecha.
 *
 * @param {() => (HTMLElement|null)} getContainer
 * @param {{ orientation?: 'vertical'|'horizontal'|'both', itemSelector?: string }} [opts]
 */
export function useArrowNavigation(getContainer, opts = {}) {
  const { orientation = 'vertical', itemSelector } = opts

  function items() {
    const container = getContainer()
    if (!container) return []
    return itemSelector
      ? Array.from(container.querySelectorAll(itemSelector))
      : getFocusable(container)
  }

  function onKeydown(e) {
    const list = items()
    if (list.length === 0) return
    const idx = list.indexOf(document.activeElement)
    if (idx === -1) return

    const next = orientation !== 'horizontal' && e.key === 'ArrowDown'
    const prev = orientation !== 'horizontal' && e.key === 'ArrowUp'
    const right = orientation !== 'vertical' && e.key === 'ArrowRight'
    const left = orientation !== 'vertical' && e.key === 'ArrowLeft'

    let target = null
    if (next || right) target = list[(idx + 1) % list.length]
    else if (prev || left) target = list[(idx - 1 + list.length) % list.length]
    else if (e.key === 'Home') target = list[0]
    else if (e.key === 'End') target = list[list.length - 1]

    if (target) {
      e.preventDefault()
      target.focus()
    }
  }

  return { onKeydown }
}

/**
 * Crea/actualiza un "skip link" que salta al contenido principal (`#main`).
 * Es idempotente: reutiliza el enlace si ya existe.
 */
export function installSkipLink(targetId = 'main-content', label = 'Saltar al contenido principal') {
  if (typeof document === 'undefined') return null
  let link = document.getElementById('a11y-skip-link')
  if (!link) {
    link = document.createElement('a')
    link.id = 'a11y-skip-link'
    link.className = 'skip-link'
    document.body.insertBefore(link, document.body.firstChild)
  }
  link.href = `#${targetId}`
  link.textContent = label
  link.addEventListener('click', (e) => {
    const target = document.getElementById(targetId)
    if (target) {
      e.preventDefault()
      focusElement(target)
      target.scrollIntoView()
    }
  })
  return link
}

/** Respeta la preferencia del sistema de "reducir movimiento". */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
