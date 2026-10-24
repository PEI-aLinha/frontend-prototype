import { expect, test } from '@playwright/test'
import { ORG, start } from './helpers'

// Closing a dialog gives focus back to the button that opened it (WCAG 2.4.3).
const OPENERS: Array<{ path: string; as: 'rui' | 'pedro' | 'marta'; snap: 'c1' | 'c2' | 'c3'; button: string | RegExp; dialog: string | RegExp }> = [
  { path: `${ORG}/ativos`, as: 'rui', snap: 'c1', button: 'Adicionar ativo', dialog: /ativo/i },
  { path: `${ORG}/ativos`, as: 'rui', snap: 'c1', button: 'Exportar Lista de Ativos', dialog: /Exportar/ },
  { path: '/clientes/componentes-agueda/riscos', as: 'marta', snap: 'c2', button: 'Novo risco', dialog: /risco/i },
  { path: `${ORG}/equipa`, as: 'rui', snap: 'c1', button: 'Convidar analista', dialog: /Convidar/ },
  { path: `${ORG}/integracoes`, as: 'rui', snap: 'c2', button: 'Ligar', dialog: /Ligar/ },
  { path: `${ORG}/avaliacao/sec-acessos/q-acessos-wifi`, as: 'rui', snap: 'c1', button: /^Delegar a/, dialog: 'Delegar pergunta' },
]

for (const o of OPENERS) {
  test(`focus returns to "${o.button}" on ${o.path}`, async ({ page }) => {
    await start(page, o.path, o.as, o.snap)
    const opener = page.getByRole('button', { name: o.button }).first()
    await opener.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

test('focus returns to the import button after closing the import dialog', async ({ page }) => {
  await start(page, `${ORG}/ativos`, 'rui', 'c1')
  const opener = page.getByRole('button', { name: /Importar/ }).first()
  await opener.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
})

// Chromium centres the focused element, Safari scrolls it just into view, so instead of reproducing
// the scroll, check that the page reserves room for the fixed bars (WCAG 2.4.11).
test('scroll padding keeps focused fields clear of the mobile bars', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'the tab bar only exists on mobile')
  await start(page, `${ORG}/tarefas/task-pergunta-mfa/pergunta`, 'pedro', 'c1')
  await expect(page.locator('h1')).toBeVisible()
  const bar = (await page.getByRole('navigation', { name: 'Navegação principal (mobile)' }).boundingBox())!
  const header = (await page.getByRole('banner').first().boundingBox())!
  const padding = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    return { top: parseFloat(cs.scrollPaddingTop), bottom: parseFloat(cs.scrollPaddingBottom) }
  })
  expect(padding.bottom).toBeGreaterThanOrEqual(bar.height)
  expect(padding.top).toBeGreaterThanOrEqual(header.height)
})

test('each route has its own title and navigation moves focus to the new h1', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'side navigation is desktop only')
  await start(page, `${ORG}/inicio`, 'rui', 'c3')
  await expect(page).toHaveTitle('Início · aLinha')
  for (const [link, title, heading] of [['Ativos', 'Ativos · aLinha', /Ativos/], ['Riscos', 'Riscos · aLinha', /Riscos/], ['Avaliação', 'Avaliação · aLinha', /Avaliação/]] as const) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: link, exact: true }).click()
    await expect(page).toHaveTitle(title)
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
  }
})

test('the demo button name starts with its visible text', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the visible label is hidden on small screens')
  await start(page, `${ORG}/inicio`, 'rui', 'c3')
  await expect(page.getByRole('button', { name: /^Demo · Rui/ })).toBeVisible()
})

test('"question not found" has an h1 and a way back to the tasks', async ({ page }) => {
  await start(page, `${ORG}/tarefas/nao-existe/pergunta`, 'pedro', 'c1')
  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta não encontrada' })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Voltar às tarefas' }).click()
  await expect(page).toHaveURL(/\/tarefas(\?|$)/)
})

test('registration says every field is required and marks them', async ({ page }) => {
  await start(page, '/registo/conta', 'rui', 'c1')
  await expect(page.getByText('Todos os campos são obrigatórios.')).toBeVisible()
  for (const label of ['Nome completo', 'Email profissional', 'Palavra-passe', 'Repetir a palavra-passe']) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-required', 'true')
  }
})

test('when the opener is gone after closing, focus goes to the page heading', async ({ page }) => {
  await start(page, `${ORG}/avaliacao/sec-acessos/q-acessos-wifi`, 'rui', 'c1')
  await page.getByRole('button', { name: /^Delegar a/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Delegar a/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
})
