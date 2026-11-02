// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')

/** Token map of the CSS block whose selector list contains `selector` (exact line match). */
function block(selector: string): Record<string, string> {
  const start = css.split('\n').findIndex((l) => l.trim().replace(/[,{]\s*$/, '').trim() === selector)
  if (start < 0) throw new Error(`selector not found: ${selector}`)
  const body = css.slice(css.indexOf('{', css.split('\n').slice(0, start).join('\n').length) + 1)
  const end = body.indexOf('}')
  return Object.fromEntries([...body.slice(0, end).matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}

const base = block('@theme')
const dark = { ...base, ...block(":root[data-theme='dark']") }
const MODES: Record<string, Record<string, string>> = {
  light: base,
  dark,
  'light protan/deutan': { ...base, ...block("[data-cvd='protanopia']") },
  'dark protan/deutan': { ...dark, ...block("[data-theme='dark'] :is([data-cvd='protanopia'], [data-cvd='deuteranopia'])") },
  'light tritan': { ...base, ...block("[data-cvd='tritanopia']") },
  'dark tritan': { ...dark, ...block("[data-theme='dark'] [data-cvd='tritanopia']") },
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

const TEXT_PAIRS = [
  ['risk-low-ink', 'risk-low'], ['risk-medium-ink', 'risk-medium'], ['risk-high-ink', 'risk-high'],
  ['brand', 'signal-soft'], ['ink-soft', 'paper'], ['muted', 'paper'], ['muted', 'paper-soft'], ['white', 'brand'], ['brand', 'brand-soft'],
  ['ink', 'paper'], ['danger', 'paper'], ['white', 'brand-deep'],
  // Filled surfaces with on-brand text (toast error, tooltip, stepper, badges).
  ['white', 'risk-high-ink'], ['white', 'ink'], ['white', 'signal'], ['white', 'danger'],
]
// Borders of inputs, selects and option cards are what tells you where to click (WCAG 1.4.11).
const UI_PAIRS = [['line', 'paper'], ['line', 'paper-soft'], ['signal', 'paper']]

describe.each(Object.entries(MODES))('WCAG AA contrast — %s', (_, t) => {
  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })
  it.each(UI_PAIRS)('%s on %s ≥ 3', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(3)
  })
})

/* Risk levels must stay distinguishable for each deficiency (Machado et al. 2009, severity 1.0). */
const SIM: Record<string, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
}
const lin = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
function oklab([r, g, b]: number[]): number[] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const simulate = (hex: string, m: number[][]) => { const c = lin(hex); return oklab(m.map((row) => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2])))) }
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const MIN_DELTA = 0.08

describe.each([
  ['protanopia', 'light protan/deutan'], ['protanopia', 'dark protan/deutan'],
  ['deuteranopia', 'light protan/deutan'], ['deuteranopia', 'dark protan/deutan'],
  ['tritanopia', 'light tritan'], ['tritanopia', 'dark tritan'],
])('%s distinguishes risk levels (%s)', (cvd, mode) => {
  it.each([['low', 'medium'], ['medium', 'high'], ['low', 'high']])('risk-%s-ink vs risk-%s-ink', (a, b) => {
    const t = MODES[mode]
    expect(dist(simulate(t[`risk-${a}-ink`], SIM[cvd]), simulate(t[`risk-${b}-ink`], SIM[cvd]))).toBeGreaterThanOrEqual(MIN_DELTA)
  })
})
