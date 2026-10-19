import { expect, test } from '@playwright/test'
import { openAsset, shot, start, startEmpty } from './helpers'

const CLIENT = '/clientes/componentes-agueda'

test('Portfolio — no illustrative client can be opened before the first registration', async ({ page }) => {
  await startEmpty(page)
  await page.goto('/carteira?as=marta')
  await expect(page.getByRole('list', { name: 'Clientes' }).getByRole('listitem')).toHaveCount(11)
  await expect(page.getByRole('button', { name: /^Abrir / })).toHaveCount(0)
})

test('Scenario 2 — Marta registers the ransomware risk, links actions and the roadmap is reprioritized', async ({ page }) => {
  await start(page, '/carteira', 'marta', 'c2')

  // 1. Portfolio → client
  await page.goto('/carteira')
  await expect(page.getByRole('heading', { name: 'Carteira de clientes' })).toBeVisible()
  await expect(page.getByText('Avaliação concluída').first()).toBeVisible()
  await shot(page, 'c2-01-carteira')
  await page.getByRole('button', { name: 'Abrir Componentes Águeda, Lda.' }).click()
  await expect(page.getByRole('heading', { name: 'Componentes Águeda, Lda.' })).toBeVisible()
  await shot(page, 'c2-02-visao-geral')

  // Roadmap before
  await page.goto(`${CLIENT}/roadmap`)
  await expect(page.getByText('Ainda não há ações ligadas a riscos.')).toBeVisible()
  await shot(page, 'c2-03-roadmap-antes')

  // 2. Inventory with shortcut
  await page.goto(`${CLIENT}/ativos`)
  await expect(page.getByText('PLC das linhas de montagem').locator('visible=true').first()).toBeVisible()
  await shot(page, 'c2-04-inventario')
  await openAsset(page, 'Servidor de produção')
  await page.getByRole('dialog').getByRole('tab', { name: /Riscos/ }).click()
  await page.getByRole('link', { name: 'Registar risco sobre este ativo' }).click()

  // 3. New risk
  const drawer = page.getByRole('dialog', { name: 'Novo risco' })
  await expect(drawer).toBeVisible()
  await drawer.getByLabel('Ameaça').fill('Ransomware no servidor de produção')
  await drawer.getByRole('radiogroup', { name: 'Probabilidade', exact: true }).getByRole('radio', { name: 'Média' }).click()
  await drawer.getByRole('radiogroup', { name: 'Impacto', exact: true }).getByRole('radio', { name: 'Alto' }).click()
  await expect(drawer.getByText('Média × Alto = Alto')).toBeVisible()
  await drawer.getByText('Mitigar', { exact: true }).click()
  await drawer.getByRole('button', { name: 'Registar risco' }).click()
  await expect(drawer.getByText('Para mitigar, ligue pelo menos uma ação do roadmap', { exact: false })).toBeVisible()

  // 4. Link to roadmap actions
  await drawer.getByText('Implementar autenticação multifator (MFA)', { exact: false }).click()
  await drawer.getByText('Testar a reposição das cópias de segurança').click()
  await drawer.getByLabel(/O que isto significa/).fill('Um vírus pode bloquear o servidor e parar a produção durante dias.')
  await shot(page, 'c2-05-novo-risco')
  await drawer.getByRole('button', { name: 'Registar risco' }).click()
  await expect(page.getByText('Risco "Ransomware no servidor de produção" registado')).toBeVisible()
  await expect(page.getByText(/subiram no roadmap/)).toBeVisible()

  // 5. Matrix: clicking a cell filters the table
  await page.getByRole('button', { name: /Probabilidade Média, impacto Alto/ }).click()
  await expect(page.getByText('A mostrar 1 de 6 riscos (filtro da matriz).')).toBeVisible()
  await shot(page, 'c2-06-matriz')

  // Effect on the roadmap
  await page.getByRole('link', { name: /Ver antes e depois/ }).click()
  await expect(page.getByText('Prioridade aumentada pelo risco: Ransomware no servidor de produção').first()).toBeVisible()
  const first = page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).getByRole('listitem').first()
  await expect(first).toContainText('autenticação multifator')
  await shot(page, 'c2-07-roadmap-depois')
  await page.getByRole('radio', { name: 'Antes dos riscos' }).click()
  await expect(page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).getByRole('listitem').first()).toContainText('MyCiber')

  // 6. Validation
  await page.getByRole('button', { name: 'Validar roadmap' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Validar roadmap' }).click()
  await expect(page.getByText('Roadmap validado · o Rui foi notificado')).toBeVisible()
  await expect(page.getByText('Proposta pela IA · por validar').first()).toBeHidden()
  await expect(page.getByText('Validada pela consultora', { exact: true }).first()).toBeVisible()
})

test('Scenario 2 — Marta gets the same numbers, and links only to the pages she can reach', async ({ page }) => {
  await start(page, `${CLIENT}/roadmap`, 'marta', 'c3')
  await page.goto(`${CLIENT}/roadmap?as=marta`)

  // There is no assessment route under /clientes, so the level is a card, not a dead link.
  await expect(page.getByText('2 → 3 de 5')).toBeVisible()
  await expect(page.getByRole('link', { name: /2 → 3 de 5/ })).toHaveCount(0)

  await expect(page.getByRole('link', { name: /1 risco sem ação/ })).toHaveAttribute('href', `${CLIENT}/riscos`)
  await expect(page.getByRole('link', { name: /1 de 7 recolhidas/ })).toHaveAttribute('href', `${CLIENT}/integracoes`)
  await expect(page.getByText('Próximo prazo: 15 nov. 2026 · Registar a entidade no MyCiber.')).toBeVisible()

  // The consultant reads the threat, where the client reads the consequence.
  const topRisks = page.getByRole('list', { name: 'Riscos mais graves' }).locator('li')
  await expect(topRisks).toHaveCount(3)
  await expect(topRisks.first()).toContainText('Ransomware')
  await expect(page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).locator('li')).toHaveCount(7)
  await expect(page.getByRole('list', { name: 'Progresso do plano' }).locator('li')).toHaveCount(7)
})

test('Scenario 2 — the consultant adjusts the plan, and the history records it', async ({ page }) => {
  await start(page, `${CLIENT}/roadmap`, 'marta', 'c3')
  await page.goto(`${CLIENT}/roadmap?as=marta`)

  await page.getByRole('button', { name: 'Propor ação', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Propor ação' }).click()
  await expect(page.getByText('Descreva a ação em pelo menos 5 caracteres.')).toBeVisible()

  await page.getByLabel('O que fazer').fill('Rever com a direção a política de acessos ao ERP')
  await page.getByRole('dialog').getByRole('button', { name: 'Propor ação' }).click()
  await expect(page.getByRole('heading', { name: 'Rever com a direção a política de acessos ao ERP' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).locator('li').filter({ hasText: 'Rever com a direção' })).toContainText('Proposta pela consultora')

  await page.getByRole('button', { name: 'Histórico' }).click()
  await expect(page.getByRole('dialog').getByText('propôs a ação "Rever com a direção a política de acessos ao ERP"')).toBeVisible()
})

test('Scenario 2 — the export follows the order on screen', async ({ page }) => {
  await start(page, `${CLIENT}/roadmap`, 'marta', 'c3')
  await page.goto(`${CLIENT}/roadmap?as=marta`)

  // The listener has to be attached before the click, or the popup opens unseen.
  const opened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Exportar' }).click()
  let win = await opened
  await win.waitForLoadState('domcontentloaded')
  await expect(win).toHaveTitle(/^Resultados e roadmap — /)
  await expect(win.locator('h2')).toHaveText(['Resumo', 'Plano de ação · priorizado pelos riscos', 'Registo de riscos'])
  await win.close()

  await page.getByRole('radio', { name: 'Antes dos riscos' }).click()
  const reopened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Exportar' }).click()
  win = await reopened
  await win.waitForLoadState('domcontentloaded')
  await expect(win.locator('h2').nth(1)).toHaveText('Plano de ação · ordem proposta pela IA')
})

test('Scenario 2 — accepting a risk requires a justification and the history records the change', async ({ page }) => {
  await start(page, `${CLIENT}/riscos`, 'marta', 'c2')
  await page.goto(`${CLIENT}/riscos`)
  await page.getByRole('row', { name: /Fuga de dados pessoais/ }).or(page.getByRole('button', { name: /Fuga de dados pessoais/ })).first().click()
  const drawer = page.getByRole('dialog')
  await drawer.getByText('Aceitar', { exact: true }).click()
  await drawer.getByRole('button', { name: 'Guardar alterações' }).click()
  await expect(drawer.getByText('Explique porque é que a empresa aceita este risco.')).toBeVisible()
  await drawer.getByLabel('Justificação da aceitação').fill('Risco baixo; revemos as pastas de RH na revisão trimestral.')
  await drawer.getByRole('button', { name: 'Guardar alterações' }).click()
  await expect(page.getByText('Risco atualizado')).toBeVisible()
  await page.goto(`${CLIENT}/historico`)
  await expect(page.getByText(/editou o risco "Fuga de dados pessoais/)).toBeVisible()
  await shot(page, 'c2-08-historico')
})
