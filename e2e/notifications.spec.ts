import { expect, test } from '@playwright/test'
import { ORG, shot, start, switchPersona } from './helpers'

test('Notifications and tasks — assign, remind, change due date and Pedro is notified', async ({ page }) => {
  await start(page, `${ORG}/ativos?atribuir=1`, 'rui')
  await page.getByRole('dialog').getByRole('button', { name: 'Atribuir' }).click()
  await expect(page.getByText('Atribuído · até qui., 15 out.')).toBeVisible()

  await page.goto(`${ORG}/equipa`)
  await expect(page.getByText('Termina em 2 dias').or(page.getByText('Faltam 2 dias'))).toBeVisible()
  const row = page.locator('article').filter({ hasText: 'Registar servidores' })
  await row.getByRole('button', { name: 'Lembrar' }).click()
  await expect(page.getByText('Lembrete enviado a Pedro Almeida')).toBeVisible()
  await row.getByRole('button', { name: 'Mudar prazo' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar prazo' }).click()
  await expect(page.getByText('Prazo alterado')).toBeVisible()
  await shot(page, 'n-01-equipa')

  await switchPersona(page, 'Pedro Almeida')
  const bell = page.getByRole('button', { name: /Notificações: \d+ por ler/ }).locator('visible=true').first()
  await expect(bell).toBeVisible()
  await bell.click()
  await expect(page.getByText('Nova tarefa: registar ativos')).toBeVisible()
  await expect(page.getByText('Lembrete de Rui')).toBeVisible()
  await shot(page, 'n-02-notificacoes-pedro')
  await page.getByRole('button', { name: /Nova tarefa: registar ativos/ }).click()
  await expect(page.getByRole('heading', { name: 'Registar ativos técnicos' })).toBeVisible()
})

test('Demo guide leads to the right screen with the right persona', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui', 'c1')
  await page.keyboard.press('Alt+KeyP')
  await page.getByRole('menuitem', { name: 'Guião da demonstração' }).click()
  const guide = page.getByRole('dialog', { name: 'Guião da demonstração' })
  await guide.getByRole('listitem').filter({ hasText: 'Marta abre a carteira' }).getByRole('button', { name: 'Ir' }).click()
  await expect(page).toHaveURL(/\/carteira/)
  await expect(page.getByText('Componentes Águeda').first()).toBeVisible()
})
