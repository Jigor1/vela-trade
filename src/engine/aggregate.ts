import { isCalendar, fixedSeconds, type Timeframe } from './timeframe'

export interface Candle {
  /** Start of the candle, UTC, in seconds */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Weeks start on Monday (like Binance). The Unix epoch is a Thursday,
// so the first Monday on the grid is 1969-12-29.
const MONDAY_ANCHOR = -3 * 86400

/** Start (UTC seconds) of the candle of `tf` that contains `time`. */
export function bucketStart(time: number, tf: Timeframe): number {
  if (isCalendar(tf)) {
    const d = new Date(time * 1000)
    const monthIndex = d.getUTCFullYear() * 12 + d.getUTCMonth()
    const start = Math.floor(monthIndex / tf.n) * tf.n
    return Date.UTC(Math.floor(start / 12), start % 12, 1) / 1000
  }
  const size = fixedSeconds(tf)
  if (tf.unit === 'W') {
    return Math.floor((time - MONDAY_ANCHOR) / size) * size + MONDAY_ANCHOR
  }
  return Math.floor(time / size) * size
}

/** Groups candles (sorted ascending) into candles of `tf`. */
export function aggregateCandles(candles: Candle[], tf: Timeframe): Candle[] {
  const out: Candle[] = []
  for (const c of candles) {
    const start = bucketStart(c.time, tf)
    const last = out[out.length - 1]
    if (last && last.time === start) {
      last.high = Math.max(last.high, c.high)
      last.low = Math.min(last.low, c.low)
      last.close = c.close
      last.volume += c.volume
    } else {
      out.push({ ...c, time: start })
    }
  }
  return out
}
