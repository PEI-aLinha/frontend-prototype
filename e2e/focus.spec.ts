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
