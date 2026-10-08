export type Unit = 'm' | 'h' | 'D' | 'W' | 'M'

export interface Timeframe {
  n: number
  unit: Unit
}

const UNIT_SECONDS: Record<Exclude<Unit, 'M'>, number> = {
  m: 60,
  h: 3600,
  D: 86400,
  W: 604800,
}

/** Intervals shown in the menu (fixed list). The engine itself accepts any multiple. */
export const MENU_TIMEFRAMES = [
  '5m', '15m', '30m', '45m', '1h', '2h', '4h', '6h', '8h', '12h',
  '1D', '2D', '3D', '1W', '1M', '3M',
] as const

export const DEFAULT_QUICK_TIMEFRAMES = [
  '5m', '15m', '30m', '1h', '4h', '12h', '1D', '1W', '1M', '3M',
] as const

export function parseTimeframe(text: string): Timeframe | null {
  const m = /^(\d+)(m|h|D|W|M)$/.exec(text.trim())
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isSafeInteger(n) || n < 1) return null
  return { n, unit: m[2] as Unit }
}

export function formatTimeframe(tf: Timeframe): string {
  return `${tf.n}${tf.unit}`
}

export function isCalendar(tf: Timeframe): boolean {
  return tf.unit === 'M'
}

/** Length in seconds for fixed-length intervals; calendar months are approximated (30d), only for ranking. */
export function approxSeconds(tf: Timeframe): number {
  return tf.unit === 'M' ? tf.n * 30 * 86400 : tf.n * UNIT_SECONDS[tf.unit]
}

export function fixedSeconds(tf: Timeframe): number {
  if (tf.unit === 'M') throw new Error('Calendar months have no fixed length')
  return tf.n * UNIT_SECONDS[tf.unit]
}

/** Can `native` candles be grouped exactly into `target` candles? */
export function canBuild(native: Timeframe, target: Timeframe): boolean {
  if (isCalendar(target)) {
    if (isCalendar(native)) return target.n % native.n === 0
    // Months are built from candles that never cross a UTC day boundary.
    return 86400 % fixedSeconds(native) === 0
  }
  if (isCalendar(native)) return false
  return fixedSeconds(target) % fixedSeconds(native) === 0
}

/** The largest native interval that can build the requested one, or null if none can. */
export function pickBase(target: Timeframe, natives: Timeframe[]): Timeframe | null {
  let best: Timeframe | null = null
  for (const nat of natives) {
    if (!canBuild(nat, target)) continue
    if (!best || approxSeconds(nat) > approxSeconds(best)) best = nat
  }
  return best
}
