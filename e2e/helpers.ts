import { expect, test, type Page } from '@playwright/test'

export const ORG = '/org/componentes-agueda'

/** Starts from a clean snapshot of the demo data, as a persona. */
export async function start(page: Page, path: string, as: 'rui' | 'pedro' | 'marta', snapshot: 'c1' | 'c2' | 'c3' = 'c1') {
  await page.goto('/_design')
  await page.evaluate(() => localStorage.clear())
  if (snapshot !== 'c1') {
    await page.goto(`/?as=${as}`)
    await switchSnapshot(page, snapshot)
  }
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}as=${as}`)
}

export async function switchSnapshot(page: Page, snapshot: 'c1' | 'c2' | 'c3') {
  const labels = { c1: 'Cenário 1 · início', c2: 'Cenário 2 · início', c3: 'Cenário 3 · roadmap validado' }
  await page.getByRole('button', { name: /Demonstração: a ver como/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(labels[snapshot]) }).click()
}

/** Starts with the adhesion snapshot: no company registered yet, so the demo follows Rui's registration. */
export async function startEmpty(page: Page) {
  await page.goto('/_design')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?as=marta')
  await page.getByRole('button', { name: /Demonstração: a ver como/ }).click()
  await page.getByRole('menuitem', { name: /Adesão · empresa por registar/ }).click()
  await expect(page).toHaveURL(/\/registo\/conta/)
}

export async function switchPersona(page: Page, name: 'Rui Santos' | 'Pedro Almeida' | 'Marta Ferreira') {
  await page.getByRole('button', { name: /Demonstração: a ver como/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

export async function pickOption(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByLabel(label, { exact: typeof label === 'string' }).click()
  await page.getByRole('option', { name: option }).click()
}

export async function shot(page: Page, name: string) {
  await page.waitForTimeout(350)
  await expect(page.locator('[role=status][aria-label^="A carregar"]')).toHaveCount(0)
  const dialogOpen = await page.getByRole('dialog').count()
  if (dialogOpen) await page.waitForTimeout(400)
  await page.screenshot({ path: `e2e/__screenshots__/${test.info().project.name}/${name}.png`, fullPage: !dialogOpen })
}

/** Opens an asset: table row on desktop, card on mobile. */
export async function openAsset(page: Page, name: string) {
  const row = page.getByRole('row', { name: `Abrir ${name}` })
  const card = page.getByRole('button', { name: new RegExp(`^${name}`) })
  await row.or(card).first().click()
}

/** Assessment overview: opens the collapsed topic table and expands one topic. */
export async function openTopic(page: Page, name: string) {
  await page.getByRole('button', { name: /^Perguntas por tópico/ }).click()
  await page.getByRole('button', { name: new RegExp(`${name}`) }).click()
}
