import { expect, test } from '@playwright/test'
import { shot, start } from './helpers'

const RISKS = '/clientes/componentes-agueda/riscos'

test('Risks — residual, overdue review, archive and reopen', async ({ page }) => {
  await start(page, RISKS, 'marta', 'c3')
  await page.goto(`${RISKS}?as=marta`)
  await expect(page.getByText('Revisão atrasada').locator('visible=true').first()).toBeVisible()
  await expect(page.getByText('Toda a empresa').locator('visible=true').first()).toBeVisible()

  await page.getByRole('radio', { name: 'Depois das ações' }).click()
  await expect(page.getByRole('button', { name: /Probabilidade Baixa, impacto Alto: nível Médio, [1-9]/ })).toBeVisible()
  await shot(page, 'r-01-residual')

  await page.getByRole('row', { name: /Phishing/ }).or(page.getByRole('button', { name: /Phishing/ })).first().click()
  const drawer = page.getByRole('dialog')
  await drawer.getByRole('tab', { name: 'Estado' }).click()
  await drawer.getByRole('button', { name: 'Arquivar' }).click()
  await drawer.getByRole('button', { name: 'Arquivar' }).click()
  await expect(drawer.getByText('Explique em poucas palavras porque arquiva.')).toBeVisible()
  await drawer.getByLabel('Motivo do arquivo').fill('Duplicado do risco de acesso ao ERP')
  await drawer.getByRole('button', { name: 'Arquivar' }).click()
  await expect(page.getByText('Risco arquivado')).toBeVisible()
  await expect(page.getByRole('row', { name: /Phishing/ }).or(page.getByRole('button', { name: /Phishing/ }))).toHaveCount(0)

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByLabel(/Mostrar riscos arquivados/).click()
  await expect(page.getByLabel(/Mostrar riscos arquivados/)).toBeChecked()
  await page.getByRole('row', { name: /Phishing/ }).or(page.getByRole('button', { name: /Phishing/ })).first().click()
  await page.getByRole('dialog').getByRole('tab', { name: 'Estado' }).click()
  await page.getByRole('button', { name: 'Reabrir risco' }).click()
  await expect(page.getByText('Risco reaberto')).toBeVisible()
})

test('Risks — closing the wizard with input asks before discarding', async ({ page }) => {
  await start(page, `${RISKS}?novo=1`, 'marta', 'c2')
  const drawer = page.getByRole('dialog', { name: 'Novo risco' })
  await drawer.getByLabel('Ameaça').fill('Phishing dirigido à contabilidade')
  await drawer.getByRole('button', { name: 'Seguinte' }).click()
  await expect(drawer.getByText('Passo 2 de 3 · Avaliar')).toBeVisible()
  await expect(drawer.getByText('Phishing dirigido à contabilidade')).toBeVisible()

  await page.keyboard.press('Escape')
  const confirm = page.getByRole('dialog', { name: 'Descartar o novo risco?' })
  await confirm.getByRole('button', { name: 'Continuar a editar' }).click()
  await expect(confirm).toBeHidden()
  await expect(drawer).toBeVisible()

  await drawer.getByRole('button', { name: 'Voltar' }).click()
  await drawer.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('dialog', { name: 'Descartar o novo risco?' }).getByRole('button', { name: 'Descartar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
