import { expect, test, type Page } from '@playwright/test'
import { ORG, pickOption, start } from './helpers'

async function startEmpty(page: Page) {
  await page.goto('/_design')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?as=marta')
  await page.getByRole('button', { name: /Demonstração: a ver como/ }).click()
  await page.getByRole('menuitem', { name: /Adesão · empresa por registar/ }).click()
  await expect(page).toHaveURL(/\/registo\/conta/)
}

test('Onboarding — Rui creates the account, sets up MFA, registers the company and answers the scope questions', async ({ page }) => {
  await startEmpty(page)

  await page.getByRole('button', { name: 'Preencher com o exemplo do Rui Santos' }).click()
  await page.getByRole('button', { name: 'Criar conta e continuar' }).click()

  await expect(page).toHaveURL(/\/registo\/seguranca/)
  await page.getByRole('button', { name: 'Preencher com o código da demonstração' }).click()
  await page.getByRole('button', { name: 'Confirmar e continuar' }).click()

  await expect(page).toHaveURL(/\/registo\/organizacao/)
  await page.getByRole('button', { name: 'Preencher com o exemplo da Componentes Águeda' }).click()
  await page.getByRole('button', { name: 'Registar organização' }).click()

  await expect(page).toHaveURL(/\/registo\/concluido/)
  await expect(page.getByRole('heading', { name: /está registada/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page).toHaveURL(new RegExp(`${ORG}/ambito/perguntas`))
  await page.getByRole('group', { name: /contactos, salários/ }).getByRole('radio', { name: 'Sim' }).check({ force: true })
  await page.getByRole('group', { name: /contactos guardados/ }).getByRole('radio', { name: /^Só de empresas/ }).check({ force: true })
  await page.getByRole('group', { name: /chatbot/ }).getByRole('radio', { name: 'Não', exact: true }).check({ force: true })
  await page.getByRole('button', { name: 'Guardar respostas' }).click()

  await expect(page).toHaveURL(new RegExp(`${ORG}/ambito$`))
  await expect(page.getByRole('heading', { name: 'Que leis se aplicam à empresa' })).toBeVisible()
})

test('Invite — Ana accepts the invitation, sets a password and MFA, and lands on her tasks', async ({ page }) => {
  await start(page, '/convite/mbr-ana', 'rui')
  await expect(page.getByRole('heading', { name: /Junte-se à equipa/ })).toBeVisible()

  await page.getByRole('button', { name: 'Preencher com o exemplo' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Proteja a sua conta' })).toBeVisible()
  await page.getByRole('button', { name: 'Preencher com o código da demonstração' }).click()
  await page.getByRole('button', { name: 'Ativar e entrar' }).click()

  await expect(page).toHaveURL(new RegExp(`${ORG}/tarefas`))
  await expect(page.getByRole('heading', { name: 'Olá, Ana' })).toBeVisible()
  await expect(page.getByText('Ainda não tem tarefas')).toBeVisible()
})

test('Assign work — Rui gives Pedro a technical question, a duplicate is refused, and Pedro sees it', async ({ page }) => {
  await start(page, `${ORG}/equipa`, 'rui')
  await page.getByRole('button', { name: 'Atribuir tarefa' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Pergunta técnica', { exact: true }).click()
  await pickOption(page, 'Pergunta', /^Os servidores recebem as atualizações/)
  await dialog.getByRole('button', { name: 'Atribuir', exact: true }).click()
  await expect(page.getByText('Tarefa enviada a Pedro Almeida')).toBeVisible()

  // The same question again is refused.
  await page.getByRole('button', { name: 'Atribuir tarefa' }).click()
  await dialog.getByText('Pergunta técnica', { exact: true }).click()
  await pickOption(page, 'Pergunta', /^Os servidores recebem as atualizações/)
  await dialog.getByRole('button', { name: 'Atribuir', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Pedro Almeida já tem esta tarefa por fazer.')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()

  await page.goto(`${ORG}/tarefas?as=pedro`)
  await expect(page.getByText(/Os servidores recebem as atualizações de segurança/)).toBeVisible()
})
