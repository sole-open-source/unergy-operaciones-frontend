import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  createDecimal, add, subtract, multiply, divide, round,
  sum, toNumber, formatCurrency,
} from './financialCalculations.js'

describe('createDecimal', () => {
  it('wraps numbers and strings as Decimal', () => {
    expect(createDecimal(5).toNumber()).toBe(5)
    expect(createDecimal('5.5').toNumber()).toBe(5.5)
  })
  it('treats null / undefined / NaN / "" as 0 (matches legacy Number(v)||0)', () => {
    expect(createDecimal(null).toNumber()).toBe(0)
    expect(createDecimal(undefined).toNumber()).toBe(0)
    expect(createDecimal('').toNumber()).toBe(0)
    expect(createDecimal('not a number').toNumber()).toBe(0)
    expect(createDecimal(NaN).toNumber()).toBe(0)
  })
  it('returns the same Decimal instance untouched', () => {
    const d = new Decimal('1.23')
    expect(createDecimal(d).equals(d)).toBe(true)
  })
})

describe('arithmetic precision', () => {
  it('add avoids binary float error (0.1 + 0.2 === 0.3)', () => {
    expect(add(0.1, 0.2).toNumber()).toBe(0.3)
    expect(add(0.1, 0.2).equals(new Decimal('0.3'))).toBe(true)
  })
  it('subtract', () => {
    expect(subtract(0.3, 0.1).toNumber()).toBe(0.2)
  })
  it('multiply keeps precision on currency-scale numbers', () => {
    expect(multiply('1000000.05', 3).toNumber()).toBe(3000000.15)
  })
  it('divide', () => {
    expect(divide(10, 4).toNumber()).toBe(2.5)
  })
  it('handles negatives and zero', () => {
    expect(add(-5, 5).toNumber()).toBe(0)
    expect(multiply(0, 9999).toNumber()).toBe(0)
    expect(subtract(0, 7).toNumber()).toBe(-7)
  })
  it('chains without accumulating float drift', () => {
    let acc = createDecimal(0)
    for (let i = 0; i < 10; i++) acc = add(acc, 0.1)
    expect(acc.toNumber()).toBe(1)
  })
})

describe('round', () => {
  it('rounds HALF_UP to the given precision', () => {
    expect(round(2.345, 2).toNumber()).toBe(2.35)
    expect(round(2.344, 2).toNumber()).toBe(2.34)
    expect(round(0.5, 0).toNumber()).toBe(1)
  })
  it('rounds negatives HALF_UP (away from zero at .5)', () => {
    expect(round(-2.345, 2).toNumber()).toBe(-2.35)
  })
  it('defaults to 2 decimals', () => {
    expect(round(1.239).toNumber()).toBe(1.24)
  })
})

describe('sum', () => {
  it('sums a list of mixed numbers/strings/nulls', () => {
    expect(sum([0.1, 0.2, null, '0.3']).toNumber()).toBe(0.6)
  })
  it('sums by key when given accessor', () => {
    const rows = [{ v: 10 }, { v: 20.5 }, { v: null }]
    expect(sum(rows, (r) => r.v).toNumber()).toBe(30.5)
  })
  it('empty list is 0', () => {
    expect(sum([]).toNumber()).toBe(0)
  })
})

describe('toNumber', () => {
  it('converts Decimal or raw value to JS number', () => {
    expect(toNumber(createDecimal('3.14'))).toBe(3.14)
    expect(toNumber(5)).toBe(5)
    expect(toNumber(null)).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formats COP with 0 decimals by default convention when asked', () => {
    const s = formatCurrency(1234567, 'COP', 'es-CO', 0)
    expect(s).toContain('1.234.567')
    expect(s).not.toContain(',00')
  })
  it('formats COP with 2 decimals when requested', () => {
    const s = formatCurrency(1234567, 'COP', 'es-CO', 2)
    expect(s).toContain('1.234.567,00')
  })
  it('accepts Decimal instances', () => {
    const s = formatCurrency(createDecimal('1000.5'), 'COP', 'es-CO', 2)
    expect(s).toContain('1.000,50')
  })
  it('returns the em-dash placeholder for null/undefined', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
  })
  it('returns the placeholder for non-numeric junk', () => {
    expect(formatCurrency('abc')).toBe('—')
  })
  it('rounds HALF_UP at the display precision', () => {
    expect(formatCurrency(2.345, 'COP', 'es-CO', 2)).toContain('2,35')
  })
})
