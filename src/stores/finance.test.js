import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFinanceStore } from './finance.js'

describe('useFinanceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to es-CO / COP / 0 decimals (app-wide convention)', () => {
    const s = useFinanceStore()
    expect(s.currencyLocale).toBe('es-CO')
    expect(s.currencyCode).toBe('COP')
    expect(s.displayPrecision).toBe(0)
  })

  it('format() applies the default precision (0 decimals)', () => {
    const s = useFinanceStore()
    const out = s.format(1234567)
    expect(out).toContain('1.234.567')
    expect(out).not.toContain(',00')
  })

  it('format() honors a per-call precision override', () => {
    const s = useFinanceStore()
    expect(s.format(1000.5, 2)).toContain('1.000,50')
  })

  it('formattedAmount() is an alias of format()', () => {
    const s = useFinanceStore()
    expect(s.formattedAmount(1000, 2)).toBe(s.format(1000, 2))
  })

  it('null / undefined render as the em-dash placeholder', () => {
    const s = useFinanceStore()
    expect(s.format(null)).toBe('—')
    expect(s.format(undefined)).toBe('—')
  })

  it('roundForDisplay() rounds HALF_UP and returns a number', () => {
    const s = useFinanceStore()
    expect(s.roundForDisplay(2.345, 2)).toBe(2.35)
    expect(typeof s.roundForDisplay(2.345, 2)).toBe('number')
  })

  it('configure() reconfigures locale / code / precision', () => {
    const s = useFinanceStore()
    s.configure({ precision: 2 })
    expect(s.displayPrecision).toBe(2)
    expect(s.format(1000)).toContain('1.000,00')
  })
})
