import { describe, it, expect } from 'vitest'
import {
  formatKoboToNaira,
  parseNairaInputToKobo,
  addKobo,
  subtractKobo,
  assertKobo,
} from '@/utils/currency'

describe('Currency domain invariants & floating-point prevention', () => {
  it('formats 0 kobo as ₦0.00', () => {
    expect(formatKoboToNaira(0)).toMatch(/₦0\.00/)
  })

  it('formats 100050 kobo as ₦1,000.50', () => {
    const res = formatKoboToNaira(100050)
    expect(res).toMatch(/₦/)
    expect(res).toMatch(/1[,.]?000[.,]?50/)
  })

  it('formats large amounts (10,000,000 kobo) accurately', () => {
    expect(formatKoboToNaira(10_000_000)).toMatch(/100[,.]?000/)
  })

  it('converts floating-point trap value "19.99" to exactly 1999 kobo using BigInt arithmetic', () => {
    const kobo = parseNairaInputToKobo('19.99')
    expect(kobo).toBe(1999)
    expect(Number.isSafeInteger(kobo)).toBe(true)
  })

  it('converts standard and comma-separated amounts to kobo', () => {
    expect(parseNairaInputToKobo('0')).toBe(0)
    expect(parseNairaInputToKobo('1,000.50')).toBe(100050)
    expect(parseNairaInputToKobo('500')).toBe(50000)
  })

  it('rejects malformed inputs and values with >2 decimal places', () => {
    expect(parseNairaInputToKobo('19.999')).toBeNaN()
    expect(parseNairaInputToKobo('abc')).toBeNaN()
    expect(parseNairaInputToKobo('$50')).toBeNaN()
    expect(parseNairaInputToKobo('.')).toBeNaN()
  })

  it('supports negative kobo arithmetic and formats negative naira', () => {
    expect(parseNairaInputToKobo('-50.00')).toBe(-5000)
    expect(formatKoboToNaira(-5000)).toMatch(/50\.00/)
  })

  it('performs safe kobo addition and subtraction with bounds assertion', () => {
    expect(addKobo(100000, 50000)).toBe(150000)
    expect(subtractKobo(100000, 30000)).toBe(70000)
    expect(() => assertKobo(0.5)).toThrow(RangeError)
    expect(() => assertKobo(NaN)).toThrow(RangeError)
  })
})
