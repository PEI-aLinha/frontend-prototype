import { expect, test } from '@playwright/test'
import { openAsset, shot, start } from './helpers'

const CLIENT = '/clientes/componentes-agueda'

test('Cenário 2 — Marta regista o risco de ransomware, liga ações e o roadmap é repriorizado', async ({ page }) => {
  await start(page, '/carteira', 'marta', 'c2')

  // 1. Carteira → cliente
  await page.goto('/carteira')
  await expect(page.getByRole('heading', { name: 'Carteira de clientes' })).toBeVisible()
  await expect(page.getByText('Avaliação concluída').first()).toBeVisible()
  await shot(page, 'c2-01-carteira')
  await page.getByRole('button', { name: 'Abrir Componentes Águeda, Lda.' }).click()
  await expect(page.getByRole('heading', { name: 'Componentes Águeda, Lda.' })).toBeVisible()
  await shot(page, 'c2-02-visao-geral')

  // Roadmap antes
  await page.goto(`${CLIENT}/roadmap`)
  await expect(page.getByText('Ainda não há ações ligadas a riscos.')).toBeVisible()
  await shot(page, 'c2-03-roadmap-antes')

  // 2. Inventário com atalho
  await page.goto(`${CLIENT}/ativos`)
  await expect(page.getByText('PLC das linhas de montagem').locator('visible=true').first()).toBeVisible()
  await shot(page, 'c2-04-inventario')
  await openAsset(page, 'Servidor de produção')
  await page.getByRole('dialog').getByRole('tab', { name: /Riscos/ }).click()
  await page.getByRole('link', { name: 'Registar risco sobre este ativo' }).click()

  // 3. Novo risco
  const drawer = page.getByRole('dialog', { name: 'Novo risco' })
  await expect(drawer).toBeVisible()
  await drawer.getByLabel('Ameaça').fill('Ransomware no servidor de produção')
  await drawer.getByRole('radiogroup', { name: 'Probabilidade', exact: true }).getByRole('radio', { name: 'Média' }).click()
  await drawer.getByRole('radiogroup', { name: 'Impacto', exact: true }).getByRole('radio', { name: 'Alto' }).click()
  await expect(drawer.getByText('Média × Alto = Alto')).toBeVisible()
  await drawer.getByText('Mitigar', { exact: true }).click()
  await drawer.getByRole('button', { name: 'Registar risco' }).click()
  await expect(drawer.getByText('Para mitigar, ligue pelo menos uma ação do roadmap', { exact: false })).toBeVisible()

  // 4. Ligar a ações do roadmap
  await drawer.getByText('Implementar autenticação multifator (MFA)', { exact: false }).click()
  await drawer.getByText('Testar a reposição das cópias de segurança').click()
  await drawer.getByLabel(/O que isto significa/).fill('Um vírus pode bloquear o servidor e parar a produção durante dias.')
  await shot(page, 'c2-05-novo-risco')
  await drawer.getByRole('button', { name: 'Registar risco' }).click()
  await expect(page.getByText('Risco "Ransomware no servidor de produção" registado')).toBeVisible()
  await expect(page.getByText(/subiram no roadmap/)).toBeVisible()

  // 5. Matriz: clicar na célula filtra a tabela
  await page.getByRole('button', { name: /Probabilidade Média, impacto Alto/ }).click()
  await expect(page.getByText('A mostrar 1 de 5 riscos (filtro da matriz).')).toBeVisible()
  await shot(page, 'c2-06-matriz')

  // Efeito no roadmap
  await page.getByRole('link', { name: /Ver antes e depois/ }).click()
  await expect(page.getByText('Prioridade aumentada pelo risco: Ransomware no servidor de produção').first()).toBeVisible()
  const first = page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).getByRole('listitem').first()
  await expect(first).toContainText('autenticação multifator')
  await shot(page, 'c2-07-roadmap-depois')
  await page.getByRole('radio', { name: 'Antes dos riscos' }).click()
  await expect(page.getByRole('list', { name: 'Ações do roadmap por prioridade' }).getByRole('listitem').first()).toContainText('MyCiber')

  // 6. Validação
  await page.getByRole('button', { name: 'Validar roadmap' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Validar roadmap' }).click()
  await expect(page.getByText('Roadmap validado · o Rui foi notificado')).toBeVisible()
})

test('Cenário 2 — aceitar um risco exige justificação e o histórico regista a alteração', async ({ page }) => {
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
