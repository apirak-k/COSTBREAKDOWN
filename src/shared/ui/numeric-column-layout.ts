import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { businessNumberPresentation, type NumericDisplayOptions } from './numeric-display'

let canvas: HTMLCanvasElement | undefined
const textWidths = new Map<string, number>()
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Measure text in the actual rendered font; this never determines outer geometry. */
export function measureNumericText(text: string, font: string, letterSpacing = 0): number {
  if (typeof document === 'undefined') return 0
  const key = `${font}|${letterSpacing}|${text}`
  const cached = textWidths.get(key)
  if (cached !== undefined) return cached
  canvas ??= document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return 0
  context.font = font
  const width = context.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing
  if (textWidths.size > 2048) textWidths.clear()
  textWidths.set(key, width)
  return width
}

export function useNumericColumnMetrics(ref: RefObject<HTMLElement>, enabled: boolean) {
  const [metrics, setMetrics] = useState({ width: 0, font: '', letterSpacing: 0, borderLeft: 0, borderRight: 0, fontRevision: 0 })
  useBrowserLayoutEffect(() => {
    const element = ref.current
    if (!enabled || !element) return
    const update = () => {
      const style = getComputedStyle(element)
      const next = {
        width: element.getBoundingClientRect().width,
        font: [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' '),
        letterSpacing: parseFloat(style.letterSpacing) || 0,
        borderLeft: parseFloat(style.borderLeftWidth) || 0,
        borderRight: parseFloat(style.borderRightWidth) || 0
      }
      setMetrics(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : { ...next, fontRevision: previous.fontRevision })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    const handleFontsLoaded = () => {
      textWidths.clear()
      update()
      setMetrics(previous => ({ ...previous, fontRevision: previous.fontRevision + 1 }))
    }
    document.fonts?.addEventListener('loadingdone', handleFontsLoaded)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', handleFontsLoaded)
    }
  }, [enabled, ref])
  return metrics
}

/** Ordinary halves share the fixed region center; fallback is one centered scientific token. */
export function numericColumnPresentation(
  value: number | null | undefined,
  options: NumericDisplayOptions,
  width: number,
  measure: (text: string) => number,
  reserveEnd = 0,
  prefix = ''
) {
  const ordinary = businessNumberPresentation(value, { ...options, percent: false, integerDigits: Infinity })
  if (ordinary.notation !== 'ordinary' || width === 0) return ordinary
  const whole = prefix + ordinary.text.split('.')[0]
  const fraction = ordinary.text.includes('.') ? ordinary.text.slice(ordinary.text.indexOf('.')) : ''
  const fractionWidth = measure(fraction)
  const fits = measure(whole) <= width / 2 - 2
    && (options.integer || fractionWidth <= width / 2 - 2 - reserveEnd)
  if (fits) return ordinary
  return {
    text: `${options.signPositive && value! > 0 ? '+' : ''}${value!.toExponential(2).toUpperCase()}`,
    notation: 'scientific' as const,
    fractionDigits: 0
  }
}

export function numericScientificFitFloor(measure: (text: string) => number, signed = true, prefix = ''): number {
  return Math.max(...['9.99E+308', '9.99E-324'].map(text => measure(`${prefix}${signed ? '-' : ''}${text}`))) + 2
}

/** Include kerning into the decimal boundary instead of estimating glyph counts. */
export function numericDecimalPrefixWidth(text: string, measure: (text: string) => number): number {
  const point = text.indexOf('.')
  return point < 0 ? measure(text) : measure(text.slice(0, point + 1)) - measure('.')
}
