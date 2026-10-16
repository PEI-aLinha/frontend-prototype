import { expect, test } from '@playwright/test'
import { openAsset, ORG, shot, start, switchPersona } from './helpers'

test.beforeEach(async ({ page }) => {
  await start(page, `${ORG}/ativos`, 'rui', 'c2')
  await switchPersona(page, 'Rui Santos')
  await page.goto(`${ORG}/ativos`)
})

test('Import assets from CSV with preview and per-row errors', async ({ page }) => {
  await page.getByRole('button', { name: 'Importar de Excel (CSV)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar ativos de uma folha de cálculo' })
  await dialog.getByRole('button', { name: 'Usar ficheiro de exemplo' }).click()
  await expect(dialog.getByText('4 prontos')).toBeVisible()
  await expect(dialog.getByText('Falta o nome do ativo.')).toBeVisible()
  await expect(dialog.getByText(/Criticidade desconhecida: "Muito alta"/)).toBeVisible()
  await shot(page, 'a-01-importar')
  await dialog.getByRole('button', { name: 'Importar 4 ativos' }).click()
  await expect(page.getByText('4 ativos importados')).toBeVisible()
  await expect(page.getByText('11', { exact: true })).toBeVisible()
})

test('By-service view, dependencies and bulk actions', async ({ page }, info) => {
  await page.getByRole('radio', { name: 'Por serviço' }).click()
  await expect(page.getByRole('region', { name: 'Produção de componentes' })).toBeVisible()
  await shot(page, 'a-02-por-servico')
  await page.getByRole('radio', { name: 'Tabela' }).click()

  await openAsset(page, 'Rede e firewall')
  const drawer = page.getByRole('dialog', { name: 'Rede e firewall' })
  await drawer.getByRole('tab', { name: /Dependências/ }).click()
  await expect(drawer.getByText(/Se este ativo falhar, 3 outros ativos são afetados/)).toBeVisible()
  await shot(page, 'a-03-dependencias')
  await drawer.getByRole('button', { name: 'Fechar painel' }).click()

  test.skip(info.project.name === 'mobile', 'Seleção em massa só na tabela de desktop')
  await page.getByRole('checkbox', { name: 'Selecionar Portáteis da administração (4)' }).check()
  await page.getByRole('checkbox', { name: 'Selecionar Email e documentos (cloud)' }).check()
  const bar = page.getByRole('region', { name: 'Ações em massa' })
  await expect(bar.getByText('2 ativos selecionados')).toBeVisible()
  await bar.getByLabel('Mudar criticidade').click()
  await page.getByRole('option', { name: 'Alta' }).click()
  await expect(page.getByText('Criticidade alterada em 2 ativos')).toBeVisible()
})

test('Export shows what is missing before reporting to CNCS', async ({ page }) => {
  await page.getByRole('button', { name: 'Exportar Lista de Ativos' }).first().click()
  await expect(page.getByText('1 ativo tem informação em falta')).toBeVisible()
  await expect(page.getByText(/falta serviço crítico/)).toBeVisible()
})
