import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import axe from 'axe-core'
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  meetsContrast,
  isValidRole,
  findUnlabeledControls,
  findImagesWithoutAlt,
  findIconOnlyControlsWithoutLabel,
  findInvalidRoles,
  auditDom,
} from '@/utils/a11yValidators.js'
import {
  getFocusable,
  announce,
  focusElement,
} from '@/composables/useA11yFocus.js'

// ── Contraste de color (WCAG 2.1) ──────────────────────────────────────────
describe('validadores de contraste', () => {
  it('convierte hex de 3 y 6 dígitos', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#915BD8')).toEqual({ r: 145, g: 91, b: 216 })
    expect(hexToRgb('nope')).toBeNull()
  })

  it('calcula luminancia relativa en rango 0..1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
  })

  it('negro sobre blanco da 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('detecta pares que cumplen y que fallan AA', () => {
    // Púrpura de marca sobre avena: texto principal, debe pasar AA.
    expect(meetsContrast('#2C2039', '#FDFAF7', 'AA')).toBe(true)
    // El subtítulo original (#9b8fb0) fallaba; el corregido (#6b5a8a) pasa.
    expect(meetsContrast('#9b8fb0', '#FDFAF7', 'AA')).toBe(false)
    expect(meetsContrast('#6b5a8a', '#FDFAF7', 'AA')).toBe(true)
  })

  it('umbral de texto grande es más permisivo', () => {
    // Un par con ~3.2:1 falla como texto normal pero pasa como texto grande.
    const a = '#767676'
    const b = '#ffffff'
    expect(contrastRatio(a, b)).toBeGreaterThan(4.5) // #767676 es el mínimo AA clásico
    expect(meetsContrast('#949494', '#ffffff', 'AA', false)).toBe(false)
    expect(meetsContrast('#949494', '#ffffff', 'AA', true)).toBe(true)
  })
})

// ── Roles ARIA ─────────────────────────────────────────────────────────────
describe('validación de roles ARIA', () => {
  it('acepta roles válidos y rechaza inválidos', () => {
    expect(isValidRole('dialog')).toBe(true)
    expect(isValidRole('navigation')).toBe(true)
    expect(isValidRole('bogus-role')).toBe(false)
    expect(isValidRole('')).toBe(false)
  })
})

// ── Auditoría del DOM ───────────────────────────────────────────────────────
describe('auditoría de accesibilidad sobre el DOM', () => {
  let root
  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })
  afterEach(() => {
    root.remove()
  })

  it('detecta controles sin etiqueta', () => {
    root.innerHTML = '<input type="text" />'
    expect(findUnlabeledControls(root)).toHaveLength(1)

    root.innerHTML = '<label for="x">Nombre</label><input id="x" type="text" />'
    expect(findUnlabeledControls(root)).toHaveLength(0)

    root.innerHTML = '<input type="text" aria-label="Buscar" />'
    expect(findUnlabeledControls(root)).toHaveLength(0)
  })

  it('detecta imágenes sin alt', () => {
    root.innerHTML = '<img src="x.png" />'
    expect(findImagesWithoutAlt(root)).toHaveLength(1)

    root.innerHTML = '<img src="x.png" alt="Logo" /><img src="y.png" alt="" role="presentation" />'
    expect(findImagesWithoutAlt(root)).toHaveLength(0)
  })

  it('detecta botones de solo ícono sin nombre', () => {
    root.innerHTML = '<button><i class="pi pi-times"></i></button>'
    expect(findIconOnlyControlsWithoutLabel(root)).toHaveLength(1)

    root.innerHTML = '<button aria-label="Cerrar"><i class="pi pi-times"></i></button>'
    expect(findIconOnlyControlsWithoutLabel(root)).toHaveLength(0)
  })

  it('detecta roles inválidos', () => {
    root.innerHTML = '<div role="invalid-role">x</div>'
    expect(findInvalidRoles(root)).toHaveLength(1)
    root.innerHTML = '<div role="navigation">x</div>'
    expect(findInvalidRoles(root)).toHaveLength(0)
  })

  it('auditDom agrupa todos los problemas', () => {
    root.innerHTML = '<input type="text" /><img src="x.png" />'
    const { ok, issues } = auditDom(root)
    expect(ok).toBe(false)
    expect(issues.length).toBe(2)
    const rules = issues.map((i) => i.rule)
    expect(rules).toContain('label')
    expect(rules).toContain('image-alt')
  })
})

// ── Gestión de foco ─────────────────────────────────────────────────────────
describe('utilidades de foco', () => {
  let root
  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })
  afterEach(() => root.remove())

  it('getFocusable lista solo elementos enfocables', () => {
    root.innerHTML = `
      <button>uno</button>
      <a href="#">dos</a>
      <input type="hidden" />
      <button disabled>no</button>
      <div tabindex="0">tres</div>
      <div tabindex="-1">no</div>
    `
    const list = getFocusable(root)
    // jsdom no calcula layout, pero getClientRects devuelve rects para los
    // elementos presentes; validamos que excluye disabled/hidden/tabindex -1.
    const texts = list.map((el) => el.textContent?.trim() || el.type)
    expect(texts).toContain('uno')
    expect(texts).toContain('dos')
    expect(texts).toContain('tres')
    expect(texts).not.toContain('no')
  })

  it('focusElement enfoca un elemento no enfocable haciéndolo tabindex -1', () => {
    const h = document.createElement('h1')
    h.textContent = 'Título'
    root.appendChild(h)
    focusElement(h)
    expect(h.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(h)
  })

  it('announce escribe en la región live compartida', async () => {
    announce('Hola lector de pantalla')
    const region = document.getElementById('a11y-live-region')
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-live')).toBe('polite')
    // El texto se escribe en el siguiente frame de animación.
    await new Promise((r) => requestAnimationFrame(r))
    expect(region.textContent).toBe('Hola lector de pantalla')
  })
})

// ── axe-core: humo sobre fragmentos representativos ─────────────────────────
describe('axe-core smoke tests', () => {
  it('un formulario con labels no reporta violaciones de "label"', async () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <form aria-label="prueba">
        <label for="a">Correo</label>
        <input id="a" type="email" />
        <label for="b">Contraseña</label>
        <input id="b" type="password" />
        <button type="submit">Ingresar</button>
      </form>`
    document.body.appendChild(container)
    const results = await axe.run(container, {
      runOnly: ['label', 'button-name', 'aria-required-attr'],
    })
    expect(results.violations).toHaveLength(0)
    container.remove()
  })

  it('detecta un input sin label vía axe', async () => {
    const container = document.createElement('div')
    container.innerHTML = '<input type="text" />'
    document.body.appendChild(container)
    const results = await axe.run(container, { runOnly: ['label'] })
    expect(results.violations.length).toBeGreaterThan(0)
    container.remove()
  })
})
