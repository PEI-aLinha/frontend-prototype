import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

// WCAG 1.4.12: with the "text spacing" bookmarklet values nothing is cut off or overlaps.
const SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`

const PAGES: Array<[string, 'rui' | 'pedro' | 'marta', 'c1' | 'c2' | 'c3']> = [
  [`${ORG}/inicio`, 'rui', 'c3'],
  [`${ORG}/ativos`, 'rui', 'c1'],
  [`${ORG}/riscos`, 'rui', 'c3'],
  [`${ORG}/avaliacao`, 'rui', 'c1'],
  [`${ORG}/avaliacao/sec-acessos/q-acessos-wifi`, 'rui', 'c1'],
  [`${ORG}/tarefas`, 'pedro', 'c2'],
  [`${ORG}/integracoes`, 'rui', 'c2'],
  ['/carteira', 'marta', 'c2'],
  ['/registo/conta', 'rui', 'c1'],
]

for (const [path, as, snap] of PAGES) {
  test(`text spacing ${as} ${path}`, async ({ page }) => {
    await start(page, path, as, snap)
    await expect(page.locator('h1')).toBeVisible()
    await page.addStyleTag({ content: SPACING })
    await page.waitForTimeout(300)
    const clipped = await page.evaluate(() => {
      const out: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        if (!el.offsetParent || !el.textContent?.trim() || el.closest('.sr-only, [aria-hidden=true]')) continue
        const cs = getComputedStyle(el)
        // Ellipsis truncation is intentional (full text in title / accessible name).
        if (cs.textOverflow === 'ellipsis') continue
        const clipsX = /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1
        const clipsY = /hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1
        // Text spilling out of a fixed-height box (overflow visible) overlaps whatever is below it.
        const isTextBox = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
        const spills = isTextBox && cs.overflowY === 'visible' && cs.display !== 'inline' && el.scrollHeight > el.clientHeight + 2
        if (clipsX || clipsY || spills) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 4).join('.')}: "${el.textContent.trim().slice(0, 40)}"`)
      }
      return out
    })
    expect(clipped).toEqual([])
  })
}
