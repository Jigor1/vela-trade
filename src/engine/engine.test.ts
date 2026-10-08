import { describe, expect, it } from 'vitest'
import { parseTimeframe as p, pickBase, canBuild, MENU_TIMEFRAMES } from './timeframe'
import { aggregateCandles, bucketStart, type Candle } from './aggregate'

const tf = (s: string) => p(s)!
const utc = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  Date.UTC(y, mo - 1, d, h, mi) / 1000

describe('parseTimeframe', () => {
  it('accepts valid text and rejects the rest', () => {
    expect(p('45m')).toEqual({ n: 45, unit: 'm' })
    expect(p('3M')).toEqual({ n: 3, unit: 'M' })
    expect(p('13m')).toEqual({ n: 13, unit: 'm' })
    for (const bad of ['', '0m', '5s', 'm', '1d', '1w', '-5m', '1.5h']) expect(p(bad)).toBeNull()
  })
})

describe('pickBase', () => {
  const binance = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1D', '3D', '1W', '1M'].map(tf)
  const gecko = ['1m', '5m', '15m', '1h', '4h', '12h', '1D'].map(tf)
  const base = (t: string, n: typeof binance) => {
    const b = pickBase(tf(t), n)
    return b && `${b.n}${b.unit}`
  }
  it('uses the largest native interval that divides the request', () => {
    expect(base('45m', binance)).toBe('15m')
    expect(base('2D', binance)).toBe('1D')
    expect(base('3M', binance)).toBe('1M')
    expect(base('1W', binance)).toBe('1W')
    expect(base('12h', binance)).toBe('12h')
  })
  it('builds months and weeks from days when there is no native month', () => {
    expect(base('1M', gecko)).toBe('1D')
    expect(base('3M', gecko)).toBe('1D')
    expect(base('1W', gecko)).toBe('1D')
    expect(base('45m', gecko)).toBe('15m')
    expect(base('25m', gecko)).toBe('5m')
    expect(base('30m', gecko)).toBe('15m')
  })
  it('never lists a menu interval as impossible', () => {
    for (const t of MENU_TIMEFRAMES) {
      expect(pickBase(tf(t), binance)).not.toBeNull()
      expect(pickBase(tf(t), gecko)).not.toBeNull()
    }
  })
  it('does not mix months into fixed intervals', () => {
    expect(canBuild(tf('1M'), tf('1D'))).toBe(false)
  })
})

describe('bucketStart', () => {
  it('aligns weeks to Monday', () => {
    // 2024-05-15 is a Wednesday; its Monday is 2024-05-13
    expect(bucketStart(utc(2024, 5, 15, 10), tf('1W'))).toBe(utc(2024, 5, 13))
    expect(bucketStart(utc(2024, 5, 13), tf('1W'))).toBe(utc(2024, 5, 13))
    expect(bucketStart(utc(2024, 5, 12, 23, 59), tf('1W'))).toBe(utc(2024, 5, 6))
  })
  it('uses calendar months and quarters', () => {
    expect(bucketStart(utc(2024, 2, 29, 23), tf('1M'))).toBe(utc(2024, 2, 1))
    expect(bucketStart(utc(2024, 5, 15), tf('3M'))).toBe(utc(2024, 4, 1))
    expect(bucketStart(utc(2024, 12, 31), tf('3M'))).toBe(utc(2024, 10, 1))
    expect(bucketStart(utc(2024, 1, 1), tf('3M'))).toBe(utc(2024, 1, 1))
  })
  it('aligns minutes and hours to UTC', () => {
    expect(bucketStart(utc(2024, 5, 15, 10, 44), tf('45m'))).toBe(utc(2024, 5, 15, 10, 30))
    expect(bucketStart(utc(2024, 5, 15, 10, 45), tf('45m'))).toBe(utc(2024, 5, 15, 10, 30))
    expect(bucketStart(utc(2024, 5, 15, 11, 15), tf('45m'))).toBe(utc(2024, 5, 15, 11, 15))
    expect(bucketStart(utc(2024, 5, 15, 13, 5), tf('4h'))).toBe(utc(2024, 5, 15, 12))
  })
})

describe('aggregateCandles', () => {
  const c = (time: number, o: number, h: number, l: number, cl: number, v: number): Candle =>
    ({ time, open: o, high: h, low: l, close: cl, volume: v })

  it('builds 45m from 15m: first open, max high, min low, last close, summed volume', () => {
    const t0 = utc(2024, 5, 15, 10, 30) // 45m grid: ..., 10:30, 11:15, ...
    const out = aggregateCandles(
      [c(t0, 10, 12, 9, 11, 1), c(t0 + 900, 11, 15, 10, 14, 2), c(t0 + 1800, 14, 14, 8, 9, 3), c(t0 + 2700, 9, 9, 7, 8, 4)],
      tf('45m'),
    )
    expect(out).toEqual([c(t0, 10, 15, 8, 9, 6), c(t0 + 2700, 9, 9, 7, 8, 4)])
  })

  it('builds a calendar month from days (31 days of January)', () => {
    const days: Candle[] = []
    for (let d = 1; d <= 31; d++) days.push(c(utc(2024, 1, d), d, d + 1, d - 1, d + 0.5, 10))
    days.push(c(utc(2024, 2, 1), 100, 101, 99, 100, 5))
    const out = aggregateCandles(days, tf('1M'))
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual(c(utc(2024, 1, 1), 1, 32, 0, 31.5, 310))
    expect(out[1].time).toBe(utc(2024, 2, 1))
  })

  it('is the identity when the target equals the base', () => {
    const t0 = utc(2024, 5, 15)
    const input = [c(t0, 1, 2, 0, 1, 1), c(t0 + 86400, 1, 3, 0, 2, 1)]
    expect(aggregateCandles(input, tf('1D'))).toEqual(input)
  })
})
