import { expect, test, type Locator, type Page } from '@playwright/test'
import { ORG, start } from './helpers'

const DEFAULT_REPLY = 'Resposta de exemplo devolvida pela API do assistente.'
const DRAFT_SUGGESTION = 'Criar rascunho da política de segurança'
const DRAFT_TOPIC = 'Política de segurança'
const CONSULTANT_REPLY = 'Segue a versão revista da política, já com a revisão anual.'
const AWAITING = 'à espera de aprovação'
const CLIENT_MARTA = '/clientes/componentes-agueda/visao-geral'

/** Os saves do mock têm latência de 200–600 ms e correm em fila: damos-lhes tempo antes de mudar de persona. */
const SAVE_SETTLE_MS = 1500

async function openChat(page: Page, name: string): Promise<Locator> {
  await page.getByRole('button', { name: `Abrir ${name}` }).click()
  const dialog = page.getByRole('dialog', { name })
  await expect(dialog).toBeVisible()
  return dialog
}

async function ask(dialog: Locator, question: string) {
  await dialog.getByRole('textbox', { name: /Pergunte sobre/ }).fill(question)
  await dialog.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(dialog.getByText(DEFAULT_REPLY)).toBeVisible()
}

test('US18 - Rui pede um rascunho de política e fica à espera de revisão', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui')
  const chat = await openChat(page, 'Assistente Alinha')

  await ask(chat, 'Ajuda-me a criar um rascunho da política de segurança da informação.')

  await expect(chat.getByRole('tab', { name: /Ajuda-me a criar/ })).toContainText(AWAITING)
})

test('US18 - uma pergunta geral não vai para revisão', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui')
  const chat = await openChat(page, 'Assistente Alinha')

  await ask(chat, 'O que é a NIS2?')

  await expect(chat.getByRole('tab', { name: /O que é a NIS2/ })).not.toContainText(AWAITING)
})

test('US03 - Marta revê o rascunho pedido pelo Rui e o Rui recebe a resposta', async ({ page }) => {
  // 1. Rui pede o rascunho
  await start(page, `${ORG}/inicio`, 'rui')
  let chat = await openChat(page, 'Assistente Alinha')
  await chat.getByRole('button', { name: DRAFT_SUGGESTION }).click()
  await expect(chat.getByText(DEFAULT_REPLY)).toBeVisible()
  await expect(chat.getByRole('tab', { name: new RegExp(DRAFT_TOPIC) })).toContainText(AWAITING)
  await page.waitForTimeout(SAVE_SETTLE_MS)

  // 2. Marta abre a conversa (o widget dela atualiza de 5 em 5 s) e responde
  await page.goto(`${CLIENT_MARTA}?as=marta`)
  chat = await openChat(page, 'Assistente Alinha')
  await chat.getByRole('tab', { name: new RegExp(DRAFT_TOPIC) }).click({ timeout: 15_000 })

  await expect(chat.getByText('Está a ajudar um cliente.')).toBeVisible()
  await expect(chat.getByText('Cliente', { exact: true })).toBeVisible()
  await expect(chat.getByText('Assistente IA', { exact: true }).first()).toBeVisible()

  await chat.getByRole('textbox', { name: /Escreva a sua resposta ao cliente/ }).fill(CONSULTANT_REPLY)
  await chat.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(chat.getByText(CONSULTANT_REPLY)).toBeVisible()
  await expect(chat.getByText('Consultora', { exact: true })).toBeVisible()

  // 3. Aprova: a conversa passa a só de leitura
  await chat.getByRole('button', { name: 'Marcar como revisto' }).click()
  await expect(chat.getByText(/Conversa já revista/)).toBeVisible({ timeout: 10_000 })

  // 4. Rui vê a resposta da consultora e a notificação
  await page.goto(`${ORG}/inicio?as=rui`)
  chat = await openChat(page, 'Assistente Alinha')
  const tab = chat.getByRole('tab', { name: new RegExp(DRAFT_TOPIC) })
  await expect(tab).not.toContainText(AWAITING)
  await expect(chat.getByText(CONSULTANT_REPLY)).toBeVisible({ timeout: 10_000 })
  await expect(chat.getByText('Consultora', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape') // minimiza o chat
  await page.getByRole('button', { name: /Notificações/ }).click()
  await expect(page.getByText('A sua conversa foi revista')).toBeVisible()
})

test('US06 - Marta prepara uma notificação de incidente com IA', async ({ page }) => {
  // 1. Marta entra na plataforma e abre o assistente no ecrã de um cliente
  await start(page, CLIENT_MARTA, 'marta')
  const chat = await openChat(page, 'Assistente Alinha')

  // 2. Cria uma conversa própria (a ativa por defeito pode ser de um cliente)
  await chat.getByRole('button', { name: 'Nova conversa', exact: true }).click()

  // 3. Pede a notificação inicial de incidente (como "user", não como assistente)
  const question = 'Prepara o rascunho da notificação inicial de incidente.'
  await ask(chat, question)

  // 4. A resposta da IA aparece e, sendo consultora, a conversa não fica à espera de revisão.
  //    O separador usa o tema derivado (cortado a 34 caracteres, sem ponto final).
  await expect(chat.getByRole('tab', { name: /Prepara o rascunho/ })).not.toContainText(AWAITING)
})

test('Rui pergunta pelos prazos legais e recebe uma tabela', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui')
  const chat = await openChat(page, 'Assistente Alinha')

  await chat.getByRole('button', { name: 'Quais são os prazos legais se sofrermos um ciberataque?' }).click()

  const table = chat.getByRole('table', { name: 'Prazos legais de notificação de um incidente' })
  await expect(table).toBeVisible()
  await expect(table.getByRole('row', { name: /Alerta inicial.*CNCS \(MyCiber\).*24 horas/ })).toBeVisible()
  await expect(table.getByRole('row', { name: /Notificação de dados.*CNPD.*72 horas/ })).toBeVisible()
  await expect(chat.getByRole('tab', { name: /Prazos legais/ })).not.toContainText(AWAITING)
})