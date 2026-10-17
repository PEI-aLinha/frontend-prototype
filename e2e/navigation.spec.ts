import { expect, test } from '@playwright/test'
import { shot, start } from './helpers'

test.skip(({ isMobile }) => !isMobile, 'Tab bar só existe no mobile')

test('Mobile tab bar keeps every entry: the extras live under "Mais"', async ({ page }) => {
  await start(page, '/clientes/componentes-agueda/riscos', 'marta', 'c2')
  const tabs = page.getByRole('navigation', { name: 'Navegação principal (mobile)' })
  await tabs.getByRole('button', { name: 'Mais' }).click()
  const sheet = page.getByRole('dialog', { name: 'Mais' })
  await expect(sheet.getByRole('link', { name: 'Visão geral' })).toBeVisible()
  await shot(page, 'nav-01-mais')
  await sheet.getByRole('link', { name: 'Evidências automáticas' }).click()
  await expect(page).toHaveURL(/\/clientes\/componentes-agueda\/integracoes/)
  await expect(sheet).toBeHidden()
  await expect(tabs.getByRole('button', { name: 'Mais' })).toHaveClass(/font-bold/)
})

test('Rui reaches Integrações from the tab bar', async ({ page }) => {
  await start(page, '/org/componentes-agueda/inicio', 'rui')
  await page.getByRole('navigation', { name: 'Navegação principal (mobile)' }).getByRole('button', { name: 'Mais' }).click()
  await page.getByRole('dialog', { name: 'Mais' }).getByRole('link', { name: 'Integrações' }).click()
  await expect(page).toHaveURL(/\/org\/componentes-agueda\/integracoes/)
})
