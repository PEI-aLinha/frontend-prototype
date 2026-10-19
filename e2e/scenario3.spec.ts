import { expect, test } from '@playwright/test'
import { ORG, shot, start } from './helpers'

test('Scenario 3 — Rui sees the risks read-only after validation', async ({ page }) => {
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

test('Scenario 3 — Rui reads the plan in plain language, without the legal citations', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.goto(`${ORG}/roadmap?as=rui`)
  await expect(page.getByText('Como ler esta página')).toBeVisible()
  await expect(page.getByText('Com a palavra-passe sozinha, quem roubar uma senha entra na conta.', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('Esta ação está ligada a um risco:', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('art. 21.º', { exact: false })).toHaveCount(0)
  await expect(page.getByText('CA.03', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Origem:', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Como os riscos mudam o roadmap')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Antes dos riscos' })).toBeVisible()
  // The switch works for the client too: the base order is the gap order, where MyCiber is first.
  await page.getByRole('radio', { name: 'Antes dos riscos' }).click()
  await expect(page.getByRole('list', { name: 'O plano da empresa, por ordem de prioridade' }).getByRole('listitem').first()).toContainText('MyCiber')
  await shot(page, 'c3-04-roadmap-plano')
})

test('Scenario 3 — Rui gets three cards, each sending him to the page its number belongs to', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.goto(`${ORG}/roadmap?as=rui`)

  const level = page.getByRole('link', { name: /2 → 3 de 5/ })
  await expect(level).toHaveAttribute('href', `${ORG}/avaliacao`)
  await expect(level).toContainText('Definido · 41 de 41 perguntas respondidas')

  const gaps = page.getByRole('link', { name: /1 risco sem ação/ })
  await expect(gaps).toHaveAttribute('href', `${ORG}/riscos`)
  await expect(gaps).toContainText('7 ações por resolver, nenhuma concluída')

  const evidence = page.getByRole('link', { name: /1 de 7 recolhidas/ })
  await expect(evidence).toHaveAttribute('href', `${ORG}/integracoes`)
  await expect(evidence).toContainText('0 comprovadas, 1 por resolver')

  await expect(page.getByText('Próximo prazo: 15 nov. 2026 · Registar a entidade no MyCiber.')).toBeVisible()

  // RF17, shown only where a check exists: one action in c3 has one.
  await expect(page.getByText('Estado: não comprovada')).toHaveCount(1)
  await expect(page.getByText('9 de 15 contas com MFA · 2 administradores sem MFA')).toHaveCount(1)
})

test('Scenario 3 — the risk register moves actions down as well as up', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.goto(`${ORG}/roadmap?as=rui`)
  await expect(page.getByText(/subiram.*desceram por causa dos riscos registados/)).toBeVisible()
  await expect(page.locator('[aria-label^="Subiu"]').first()).toBeVisible()
  await expect(page.locator('[aria-label^="Desceu"]').first()).toBeVisible()
  await expect(page.getByText('Desceu porque outras ações ligadas a riscos subiram.').first()).toBeVisible()
})

test('Permissions — before validation Rui cannot see risks and Pedro never can', async ({ page }) => {
  await start(page, `${ORG}/riscos`, 'rui', 'c2')
  await page.goto(`${ORG}/riscos?as=rui`)
  await expect(page.getByText('Este ecrã não está disponível para o seu papel')).toBeVisible()
  await page.goto(`${ORG}/riscos?as=pedro`)
  await expect(page.getByText('Este ecrã não está disponível para o seu papel')).toBeVisible()
})
