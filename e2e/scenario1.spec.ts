import { expect, test } from '@playwright/test'
import { openAsset, ORG, pickOption, shot, start, switchPersona } from './helpers'

test('Cenário 1 — Rui atribui o registo, Pedro regista os ativos técnicos, Rui vê o inventário completo', async ({ page }) => {
  await start(page, `${ORG}/ativos`, 'rui')

  // 07 — Rui abre Ativos
  await expect(page.getByRole('heading', { name: 'Ativos e serviços críticos' })).toBeVisible()
  await expect(page.getByText('Este inventário é a base da análise de riscos e da Lista de Ativos que a empresa tem de comunicar ao CNCS.')).toBeVisible()
  await expect(page.getByText('Registados por si')).toBeVisible()
  await expect(page.getByText('Servidores, rede e sistemas de produção').last()).toBeVisible()
  await shot(page, 'c1-07-ativos')

  // 07b — modal Atribuir registo
  await page.getByRole('button', { name: 'Atribuir ao Pedro' }).click()
  const dialog = page.getByRole('dialog', { name: 'Atribuir registo de ativos' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('O que registar')).toHaveValue('Servidores, rede e sistemas de produção')
  await expect(dialog.getByText('Quinta-feira, 15 de outubro')).toBeVisible()
  await shot(page, 'c1-07b-atribuir')
  await dialog.getByRole('button', { name: 'Atribuir' }).click()

  // 07c — toast + chip
  await expect(page.getByRole('status').filter({ hasText: 'Tarefa enviada ao Pedro Almeida' })).toBeVisible()
  await expect(page.getByText('Atribuído · até qui., 15 out.')).toBeVisible()
  await shot(page, 'c1-07c-atribuido')

  // 09 — Pedro: As minhas tarefas
  await switchPersona(page, 'Pedro Almeida')
  await expect(page.getByRole('heading', { name: 'Olá, Pedro' })).toBeVisible()
  await expect(page.getByText('Registar servidores, rede e sistemas de produção')).toBeVisible()
  await expect(page.getByText('Inventário de ativos · 0 de 4 registados')).toBeVisible()
  await shot(page, 'c1-09-tarefas')
  await page.getByRole('button', { name: 'Registar' }).click()

  // 11 — Registar ativos técnicos
  await expect(page.getByRole('heading', { name: 'Registar ativos técnicos' })).toBeVisible()
  const assets: Array<[string, string, string, string]> = [
    ['Servidor de produção', 'Servidor', 'Sala técnica', 'Produção de componentes'],
    ['NAS de cópias de segurança', 'Armazenamento', 'Sala técnica', 'Produção de componentes'],
    ['Rede e firewall', 'Rede', 'Sala técnica', 'Todos os serviços'],
  ]
  for (const [name, type, location, service] of assets) {
    await page.getByLabel('Nome').fill(name)
    await pickOption(page, 'Tipo', type)
    await page.getByLabel(/Localização/).fill(location)
    await pickOption(page, 'Serviço crítico que suporta', service)
    await page.getByRole('button', { name: 'Guardar e adicionar outro' }).click()
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  }
  await expect(page.getByText('3 de 4 registados')).toBeVisible()

  // validação: nome vazio
  await page.getByRole('button', { name: 'Guardar e adicionar outro' }).click()
  await expect(page.getByText('Indique o nome do ativo (pelo menos 2 letras).')).toBeVisible()

  await page.getByLabel('Nome').fill('PLC das linhas de montagem')
  await pickOption(page, 'Tipo', 'Sistema de produção (OT)')
  await page.getByLabel(/Localização/).fill('Pavilhão 2')
  await shot(page, 'c1-11-registar')
  await page.getByRole('button', { name: 'Guardar e concluir' }).click()
  await expect(page.getByText('Tarefa concluída · o Rui foi notificado')).toBeVisible()
  await expect(page.getByText('Não tem tarefas pendentes. O Rui Santos foi notificado.')).toBeVisible()

  // Pedro só vê os ativos da sua tarefa
  await page.goto(`${ORG}/tarefas/task-ativos/ativos`)
  await expect(page.getByText('4 de 4 registados')).toBeVisible()
  await expect(page.getByText('ERP de gestão e faturação')).toHaveCount(0)

  // De volta ao Rui
  await switchPersona(page, 'Rui Santos')
  await page.goto(`${ORG}/ativos`)
  await expect(page.getByText('4 registados pelo Pedro Almeida')).toBeVisible()
  await expect(page.getByText('Inventário completo')).toBeVisible()
  await expect(page.getByText('PLC das linhas de montagem').locator('visible=true').first()).toBeVisible()
  await shot(page, 'c1-07d-completo')
})

test('Cenário 1 — extras: filtros, detalhe com histórico, editar, serviços e exportação', async ({ page }) => {
  await start(page, `${ORG}/ativos`, 'rui', 'c2')
  await switchPersona(page, 'Rui Santos')
  await page.goto(`${ORG}/ativos`)
  await expect(page.getByText('7', { exact: true })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Pesquisar ativos' }).fill('nas')
  await expect(page.getByText('1 de 7')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar' }).click()

  await openAsset(page, 'Servidor de produção')
  const drawer = page.getByRole('dialog', { name: 'Servidor de produção' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('tab', { name: 'Histórico' }).click()
  await expect(drawer.getByText(/registou o ativo "Servidor de produção"/)).toBeVisible()
  await drawer.getByRole('tab', { name: 'Detalhe' }).click()
  await drawer.getByLabel('Nome').fill('Servidor de produção (ERP fabril)')
  await drawer.getByRole('button', { name: 'Guardar alterações' }).click()
  await expect(page.getByText('Alterações guardadas')).toBeVisible()

  await page.getByRole('button', { name: 'Exportar Lista de Ativos' }).click()
  await expect(page.getByText('A submissão ao CNCS é feita fora do aLinha', { exact: false })).toBeVisible()
  await shot(page, 'c1-exportar')
})
