// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(tsx|css)$/.test(name) ? [path] : []
  })
}

// Font sizes in px ignore the browser/system text size setting (WCAG 1.4.4); use rem.
describe('font sizes', () => {
  it('are never set in px', () => {
    const offenders = files(join(process.cwd(), 'src')).flatMap((f) => {
      const src = readFileSync(f, 'utf8')
      return [...src.matchAll(/(?:text|leading)-\[[0-9.]+px\]|font-size:\s*[0-9.]+px/g)].map((m) => `${f}: ${m[0]}`)
    })
    expect(offenders).toEqual([])
  })
})
