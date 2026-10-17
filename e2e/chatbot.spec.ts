import { expect, test, type Page } from '@playwright/test'
import { ORG, start } from './helpers'


const DEFAULT_REPLY = 'Resposta de exemplo devolvida pela API do assistente.'

async function openChat(page: Page) {
  await page.getByRole('button', { name: /Abrir Assistente Alinha/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Assistente Alinha' }),
  ).toBeVisible()
}

async function ask(page: Page, question: string) {
  await page
    .getByRole('textbox', { name: 'Escreva a sua pergunta' })
    .fill(question)

  await page.getByRole('button', { name: 'Enviar mensagem' }).click()

  await expect(page.getByText(DEFAULT_REPLY)).toBeVisible()
}

test('US18 - Rui pede um rascunho de política ao assistente', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui')
  await openChat(page)

  await ask(
    page,
    'Ajuda-me a criar um rascunho da política de segurança da informação.',
  )

  await expect(page.getByText(DEFAULT_REPLY)).toBeVisible()
})

test('US06 - Marta prepara uma notificação de incidente com IA', async ({ page }) => {
  await start(page, '/clientes/componentes-agueda/visao-geral', 'marta')
  await openChat(page)

  await ask(
    page,
    'Ajuda-me a preparar o rascunho da notificação inicial de um incidente à CNPD.',
  )

  await expect(page.getByText(DEFAULT_REPLY)).toBeVisible()
})