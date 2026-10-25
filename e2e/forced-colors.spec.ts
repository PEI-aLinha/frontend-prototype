import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

// Windows high contrast drops backgrounds: states must survive with system colours or borders.
test.use({ colorScheme: 'dark' })

test.beforeEach(async ({ page }) => { await page.emulateMedia({ forcedColors: 'active' }) })

test('current page, selected view and primary buttons stay visible in forced colors', async ({ page }, info) => {
  await start(page, `${ORG}/ativos`, 'rui', 'c2')
  await expect(page.locator('h1')).toBeVisible()
  const highlighted = async (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor)
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  if (info.project.name === 'desktop') expect(await highlighted('aside [aria-current=page]')).not.toBe(canvas)
  expect(await highlighted('[role=radio][aria-checked=true]')).not.toBe(canvas)
  const border = await page.getByRole('button', { name: 'Adicionar ativo' }).evaluate((el) => getComputedStyle(el).borderTopWidth)
  expect(parseFloat(border)).toBeGreaterThan(0)
})

test('the chosen answer is outlined in forced colors', async ({ page }) => {
  await start(page, `${ORG}/tarefas/task-pergunta-mfa/pergunta`, 'pedro', 'c1')
  await page.getByText('Em parte', { exact: true }).click()
  const outline = await page.locator('label:has(> input:checked)').evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(outline).toBe('solid')
})
