import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

// Automated browsers never auto-start tours; `tour=1` forces the first-visit behaviour.
test('first visit opens the guided tour, Esc closes it, the button reopens it', async ({ page }) => {
  await start(page, `${ORG}/ativos?tour=1`, 'rui')
  const tour = page.getByRole('dialog', { name: 'Registe o que conhece' })
  await expect(tour).toBeVisible()
  await expect(tour.getByRole('button', { name: 'Seguinte' })).toBeFocused()

  const axe = await new AxeBuilder({ page }).include('.introjs-tooltip').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)).toEqual([])

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Delegue a parte técnica' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.introjs-tooltip')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Visita guiada' })).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('alinha-tour-ativos-cliente'))).toBe('done')

  await page.getByRole('button', { name: 'Visita guiada' }).click()
  await expect(page.getByRole('dialog', { name: 'Registe o que conhece' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar visita guiada' }).click()
  await expect(page.locator('.introjs-tooltip')).toHaveCount(0)
})

test('consultant tour walks the risk register to the end', async ({ page }) => {
  await start(page, '/clientes/componentes-agueda/riscos?tour=1', 'marta', 'c2')
  await expect(page.getByRole('dialog', { name: 'Novo risco' })).toBeVisible()
  for (const title of ['Matriz de risco', 'Por nível', 'Registo']) {
    await page.getByRole('button', { name: 'Seguinte' }).click()
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Seguinte' }).click()
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(page.locator('.introjs-tooltip')).toHaveCount(0)
})
