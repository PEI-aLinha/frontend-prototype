import { expect, test } from '@playwright/test'
import { ORG, shot, start } from './helpers'

test('Cenário 3 — Rui vê os riscos em só leitura depois da validação', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui', 'c3')
  await page.goto(`${ORG}/inicio`)
  await expect(page.getByText('1 risco alto · em tratamento')).toBeVisible()
  await shot(page, 'c3-01-inicio')

  await page.goto(`${ORG}/ativos`)
  await expect(page.getByRole('columnheader', { name: 'Risco' }).or(page.getByText('Servidor de produção').locator('visible=true')).first()).toBeVisible()
  await shot(page, 'c3-02-ativos')

  await page.goto(`${ORG}/riscos`)
  await expect(page.getByRole('heading', { name: 'Riscos', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo risco' })).toHaveCount(0)
  await page.getByRole('row', { name: /Ransomware/ }).or(page.getByRole('button', { name: /Um vírus pode bloquear/ })).first().click()
  await expect(page.getByText('O que isto significa para a empresa')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Média × Alto = Alto')).toBeVisible()
  await shot(page, 'c3-03-risco')
})

test('Permissões — antes da validação o Rui não vê riscos e o Pedro nunca vê', async ({ page }) => {
  await start(page, `${ORG}/riscos`, 'rui', 'c2')
  await page.goto(`${ORG}/riscos?as=rui`)
  await expect(page.getByText('Este ecrã não está disponível para o seu papel')).toBeVisible()
  await page.goto(`${ORG}/riscos?as=pedro`)
  await expect(page.getByText('Este ecrã não está disponível para o seu papel')).toBeVisible()
})
