import { expect, test } from '@playwright/test'
import { ORG, shot, start } from './helpers'

test('Scenario 3 — Rui sees the risks read-only after validation', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui', 'c3')
  await page.goto(`${ORG}/inicio`)
  await expect(page.getByText('1 risco alto · em tratamento')).toBeVisible()
  await shot(page, 'c3-01-inicio')

  // Only the validated home CTA leads somewhere real: it hands Rui the plan he just got validated.
  await expect(page.getByRole('link', { name: 'Ver roadmap →' })).toHaveAttribute('href', `${ORG}/roadmap`)
  await page.getByRole('link', { name: 'Ver roadmap →' }).click()
  await expect(page).toHaveURL(`${ORG}/roadmap`)
  await expect(page.getByRole('heading', { name: 'Roadmap validado' })).toBeVisible()

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

  // Each card previews three rows and says how many it left out.
  await expect(level.getByRole('list', { name: 'Secções com menos respostas' }).locator('li')).toHaveCount(3)
  await expect(level.getByText('+3')).toBeVisible()
  await expect(gaps.getByRole('list', { name: 'Riscos mais graves' }).locator('li')).toHaveCount(3)
  await expect(gaps.getByText('+3')).toBeVisible()
  await expect(evidence.getByRole('list', { name: 'Ações com a prova por resolver' }).locator('li')).toHaveCount(3)
  await expect(evidence.getByText('+4')).toBeVisible()

  // The plan is the first column; the three result cards are a summary rail beside it, after it on a phone.
  const heading = page.getByRole('heading', { name: 'Roadmap validado' })
  await expect(heading).toBeVisible()
  await expect(page.getByText('Os próximos passos')).toBeVisible()

  // Only the section subtitle calls a date a deadline; the action rows phrase it as "Prazo:".
  await expect(page.getByText('Próximo prazo: 15 nov. 2026 · Registar a entidade no MyCiber.')).toBeVisible()
  await expect(page.getByText(/Próximo prazo/)).toHaveCount(1)

  // The map is the overview above the list: one circle per action, in the order on screen.
  const map = page.getByRole('list', { name: 'Progresso do plano' })
  const rows = page.getByRole('list', { name: 'O plano da empresa, por ordem de prioridade' })
  await expect(map.locator('li')).toHaveCount(7)
  await expect(map.getByRole('button').first()).toHaveAccessibleName(/Ação 1 de 7: Implementar autenticação multifator/)
  expect((await map.boundingBox())!.y).toBeLessThan((await rows.boundingBox())!.y)

  // The link is display:contents, so the summary column is what has a box to measure.
  const headingBox = await heading.boundingBox()
  const railBox = await page.getByRole('complementary', { name: 'Resumo da avaliação' }).boundingBox()
  expect(headingBox && railBox).toBeTruthy()
  if ((page.viewportSize()?.width ?? 0) >= 1024) expect(headingBox!.x).toBeLessThan(railBox!.x)
  else expect(headingBox!.y).toBeLessThan(railBox!.y)

  // A circle hands the keyboard to its row, so the map is a way into the plan and not just a picture.
  await page.getByRole('button', { name: /Registar a entidade no MyCiber/ }).click()
  await expect(page.locator('#acao-act-myciber')).toBeFocused()
})

test('Scenario 3 — Rui can read the plan history and export it, but not change it', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.goto(`${ORG}/roadmap?as=rui`)

  // Exportar is in the same actions block, so once it is visible the absence of Propor ação is real
  // rather than just the pre-render state.
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Propor ação', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Histórico' }).click()
  await expect(page.getByRole('dialog').getByText('validou o roadmap')).toBeVisible()
})

test('Scenario 3 — the plan follows the order switch', async ({ page }) => {
  await start(page, `${ORG}/roadmap`, 'rui', 'c3')
  await page.goto(`${ORG}/roadmap?as=rui`)
  const rows = page.getByRole('list', { name: 'O plano da empresa, por ordem de prioridade' }).locator('li')
  const first = page.getByRole('list', { name: 'Progresso do plano' }).getByRole('button').first()
  await expect(page.getByRole('radio', { name: 'Priorizado pelos riscos' })).toBeChecked()
  await expect(rows.first()).toContainText('Implementar autenticação multifator')
  await expect(first).toHaveAccessibleName(/Ação 1 de 7: Implementar autenticação multifator/)

  await page.getByRole('radio', { name: 'Antes dos riscos' }).click()
  await expect(page.getByRole('radio', { name: 'Antes dos riscos' })).toBeChecked()
  await expect(rows.first()).toContainText('Registar a entidade no MyCiber')
  await expect(first).toHaveAccessibleName(/Ação 1 de 7: Registar a entidade no MyCiber/)
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
