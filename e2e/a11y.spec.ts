import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

const PAGES: Array<[string, 'rui' | 'pedro' | 'marta', 'c1' | 'c2' | 'c3']> = [
  [`${ORG}/ativos`, 'rui', 'c1'],
  [`${ORG}/tarefas`, 'pedro', 'c2'],
  [`${ORG}/tarefas/task-ativos/ativos`, 'pedro', 'c2'],
  ['/carteira', 'marta', 'c2'],
  ['/clientes/componentes-agueda/riscos', 'marta', 'c2'],
  ['/clientes/componentes-agueda/roadmap', 'marta', 'c3'],
  [`${ORG}/riscos`, 'rui', 'c3'],
  [`${ORG}/inicio`, 'rui', 'c3'],
  [`${ORG}/ambito`, 'rui', 'c1'],
  [`${ORG}/ambito/perguntas`, 'rui', 'c1'],
  [`${ORG}/enquadramento`, 'rui', 'c1'],
  [`${ORG}/definicoes`, 'rui', 'c1'],
  [`${ORG}/equipa`, 'rui', 'c1'],
  ['/convite/mbr-ana', 'rui', 'c1'],
  ['/registo/conta', 'rui', 'c1'],
  [`${ORG}/avaliacao`, 'rui', 'c1'],
  [`${ORG}/integracoes`, 'rui', 'c2'],
  [`${ORG}/avaliacao/sec-acessos`, 'rui', 'c1'],
  [`${ORG}/avaliacao/sec-acessos/q-acessos-wifi`, 'rui', 'c1'],
]

for (const [path, as, snap] of PAGES) {
  test(`a11y ${as} ${path}`, async ({ page }) => {
    await start(page, path, as, snap)
    await page.goto(`${path}?as=${as}`)
    await expect(page.locator('h1')).toBeVisible()
    await page.waitForTimeout(600)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([])
  })
}

// Headings never skip a level (h1 → h3), WCAG 1.3.1.
for (const [path, as, snap] of [...PAGES, [`${ORG}/ativos?vista=servicos`, 'rui', 'c1'] as const]) {
  test(`heading order ${as} ${path}`, async ({ page }) => {
    await start(page, path, as, snap)
    await expect(page.locator('h1')).toBeVisible()
    await page.waitForTimeout(400)
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((hs) => hs.map((h) => `${Number(h.tagName[1])} ${h.textContent?.trim().slice(0, 40)}`))
    const skips = levels.filter((l, i) => i > 0 && Number(l[0]) > Number(levels[i - 1][0]) + 1)
    expect(skips).toEqual([])
  })
}
