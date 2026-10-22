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
  [`${ORG}/avaliacao`, 'rui', 'c1'],
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
