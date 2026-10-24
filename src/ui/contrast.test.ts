// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')
const token = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))![1]

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

describe('WCAG AA contrast of design tokens', () => {
  it.each([
    ['risk-low-ink', 'risk-low'], ['risk-medium-ink', 'risk-medium'], ['risk-high-ink', 'risk-high'],
    ['brand', 'signal-soft'], ['ink-soft', 'paper'], ['muted', 'paper'], ['muted', 'paper-soft'], ['white', 'brand'], ['brand', 'brand-soft'],
  ])('%s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  // Borders of inputs, selects and option cards are what tells you where to click (WCAG 1.4.11).
  it.each([['line', 'paper'], ['line', 'paper-soft']])('%s on %s ≥ 3', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })
})
