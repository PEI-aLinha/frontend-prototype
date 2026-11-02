import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

const html = (page: import('@playwright/test').Page) => page.locator('html')

test('Appearance — theme and vision mode apply and survive a reload', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.getByRole('button', { name: 'Aparência' }).first().click()
  await page.getByRole('radio', { name: 'Escuro' }).click()
  await page.getByText('Deuteranopia', { exact: true }).click()
  await expect(page.getByRole('radio', { name: /Deuteranopia/ })).toBeChecked()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(html(page)).toHaveAttribute('data-cvd', 'deuteranopia')

  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(html(page)).toHaveAttribute('data-cvd', 'deuteranopia')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(20, 23, 25)')
})

test('Appearance — follows the OS colour scheme by default', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await page.goto('/registo/conta')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await context.close()
})
