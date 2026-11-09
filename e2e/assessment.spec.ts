import { expect, test } from '@playwright/test'
import { ORG, openTopic, start } from './helpers'

test('Assessment — Rui answers a question and the progress is kept', async ({ page }) => {
  await start(page, `${ORG}/avaliacao`, 'rui')
  await expect(page.getByRole('link', { name: 'Responder à próxima pergunta' })).toHaveAttribute('href', `${ORG}/avaliacao/sec-acessos/q-acessos-wifi`)
  await openTopic(page, 'Controlo de acessos')
  await expect(page.getByRole('progressbar', { name: 'Progresso de Controlo de acessos' })).toHaveAttribute('aria-valuenow', '7')
  await page.getByRole('link', { name: 'Ver perguntas de Controlo de acessos', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Controlo de acessos' })).toBeVisible()
  await expect(page.getByText('7 de 9 perguntas respondidas')).toBeVisible()
  await expect(page.getByText('Delegada a Pedro Almeida:')).toBeVisible()
  await page.getByRole('link', { name: /Wi-Fi para visitantes/ }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta 23 de 41' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progresso da avaliação' })).toHaveAttribute('aria-valuenow', '34')
  await expect(page.getByText('Avaliação de maturidade · NIS2 + RGPD')).toBeVisible()
  await expect(page.getByText('Pergunta técnica', { exact: true })).toBeVisible()
  await expect(page.getByText(/Progresso guardado/)).toHaveCount(0)
  const help = page.getByRole('region', { name: 'O que significa esta pergunta?' })
  await expect(help.getByText('Os visitantes não devem conseguir chegar aos servidores')).toBeVisible()
  await expect(help.getByRole('heading', { name: 'Exemplo' })).toBeVisible()
  await expect(help.getByRole('heading', { name: 'Porque é importante' })).toBeVisible()
  await expect(help.getByText('Gerado por IA · apenas informativo')).toBeVisible()

  // Without an answer, "Seguinte" skips the question; the flow continues into the next section.
  await page.getByRole('button', { name: 'Seguinte →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta 24 de 41' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progresso da avaliação' })).toHaveAttribute('aria-valuenow', '34')
  await page.getByRole('button', { name: '← Anterior' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta 23 de 41' })).toBeVisible()

  await page.getByText('Sim', { exact: true }).click()
  await page.getByLabel('Comentário').fill('Rede de visitantes separada desde 2025.')
  await page.getByRole('button', { name: 'Guardar e continuar depois' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Progresso guardado. Pode continuar quando quiser.' })).toBeVisible()
  await openTopic(page, 'Controlo de acessos')
  await expect(page.getByRole('progressbar', { name: 'Progresso de Controlo de acessos' })).toHaveAttribute('aria-valuenow', '8')

  // The answer survives a reload and can be changed later.
  await page.reload()
  await openTopic(page, 'Controlo de acessos')
  await page.getByRole('link', { name: 'Ver perguntas de Controlo de acessos', exact: true }).click()
  await expect(page.getByText('8 de 9 perguntas respondidas')).toBeVisible()
  await page.getByRole('link', { name: /Wi-Fi para visitantes/ }).click()
  await expect(page.getByRole('radio', { name: /^Sim/ })).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: /^Progresso guardado às \d{2}:\d{2}$/ })).toBeVisible()
  await expect(page.getByLabel('Comentário')).toHaveValue('Rede de visitantes separada desde 2025.')

  // "Anterior" also saves a changed answer.
  await page.getByText('Em parte', { exact: true }).click()
  await page.getByRole('button', { name: '← Anterior' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta 22 de 41' })).toBeVisible()
  await page.getByRole('button', { name: 'Seguinte →' }).click()
  await expect(page.getByRole('radio', { name: /^Em parte/ })).toBeChecked()
  await page.getByRole('link', { name: 'Voltar à Avaliação' }).click()
  await openTopic(page, 'Controlo de acessos')
  await expect(page.getByRole('progressbar', { name: 'Progresso de Controlo de acessos' })).toHaveAttribute('aria-valuenow', '8')

  // The consultant sees the answers in the history, labelled as Assessment.
  await page.goto('/clientes/componentes-agueda/historico?as=marta')
  await expect(page.getByRole('listitem').filter({ hasText: /respondeu "Em parte" à pergunta "A rede Wi-Fi/ }).getByText(/ · Avaliação$/)).toBeVisible()
})

test('Assessment — Rui delegates a question, Pedro answers it and Rui sees the answer', async ({ page }) => {
  const question = 'Todos os computadores e servidores têm proteção contra malware atualizada?'
  await start(page, `${ORG}/avaliacao/sec-incidentes/q-inc-antivirus`, 'rui')
  await page.getByRole('button', { name: 'Delegar a Pedro Almeida' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delegar pergunta' })
  await expect(dialog.getByText(question)).toBeVisible()
  await dialog.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pergunta enviada a Pedro Almeida' })).toBeVisible()
  await expect(page.getByText(/Delegada a Pedro Almeida: à espera de resposta/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Delegar/ })).toHaveCount(0)

  await page.goto(`${ORG}/tarefas?as=pedro`)
  await page.getByRole('article').filter({ hasText: question }).getByRole('button', { name: 'Responder' }).click()
  await expect(page.getByText('Avaliação de maturidade · Gestão de incidentes')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ajuda' }).getByText(/Exemplo: O Microsoft Defender/)).toBeVisible()
  await page.getByText('Em parte', { exact: true }).click()
  await page.getByLabel('Comentário').fill('Falta nos portáteis.')
  await page.getByRole('button', { name: 'Enviar resposta' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Resposta enviada ao Rui Santos' })).toBeVisible()

  await page.goto(`${ORG}/avaliacao/sec-incidentes/q-inc-antivirus?as=rui`)
  const analystAnswer = page.getByRole('region', { name: 'Resposta do analista' })
  await expect(analystAnswer.getByText('Resposta de Pedro Almeida')).toBeVisible()
  await expect(analystAnswer.getByText('"Falta nos portáteis."')).toBeVisible()
  await page.getByRole('link', { name: 'Voltar à Avaliação' }).click()
  await openTopic(page, 'Gestão de incidentes')
  await expect(page.getByRole('progressbar', { name: 'Progresso de Gestão de incidentes' })).toHaveAttribute('aria-valuenow', '5')
})

test('Assessment — the analyst cannot open it and it is read-only after submission', async ({ page }) => {
  await start(page, `${ORG}/avaliacao/sec-acessos`, 'pedro')
  await expect(page.getByText('Este ecrã não está disponível para o seu papel')).toBeVisible()

  await start(page, `${ORG}/avaliacao/sec-gov/q-gov-politica`, 'rui', 'c3')
  await expect(page.getByText('A avaliação já foi submetida. As respostas já não podem ser alteradas.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar e continuar depois' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Delegar/ })).toHaveCount(0)
  // Read-only, but still browsable.
  await expect(page.getByRole('button', { name: '← Anterior' })).toBeDisabled()
  await page.getByRole('button', { name: 'Seguinte →' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pergunta 2 de 41' })).toBeVisible()
})

test('Assessment — Rui answers the last questions and submits the assessment', async ({ page }) => {
  await start(page, `${ORG}/avaliacao`, 'rui')
  await expect(page.getByText('Faltam 7 perguntas.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submeter avaliação' })).toHaveCount(0)

  // The home page always opens the next open question (the one waiting for Pedro is skipped).
  for (let i = 0; i < 6; i++) {
    await page.goto(`${ORG}/inicio?as=rui`)
    await page.getByRole('button', { name: 'Continuar avaliação →' }).click()
    await page.getByText('Sim', { exact: true }).click()
    await page.getByRole('button', { name: 'Guardar e continuar depois' }).click()
    await expect(page).toHaveURL(new RegExp(`${ORG}/avaliacao$`))
  }
  // Rui can also answer the question waiting for Pedro himself.
  await page.goto(`${ORG}/avaliacao/sec-acessos/q-mfa?as=rui`)
  await page.getByText('Em parte', { exact: true }).click()
  await page.getByRole('button', { name: 'Guardar e continuar depois' }).click()

  await expect(page.getByRole('progressbar', { name: 'Progresso da avaliação' })).toHaveAttribute('aria-valuenow', '41')
  await page.getByRole('button', { name: 'Submeter avaliação' }).click()
  const dialog = page.getByRole('dialog', { name: 'Submeter a avaliação?' })
  await dialog.getByRole('button', { name: 'Submeter', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Avaliação submetida. A consultora vai rever as respostas.' })).toBeVisible()
  await expect(page.getByText('Concluída · a aguardar validação')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submeter avaliação' })).toHaveCount(0)

  // The answers are now read-only.
  await page.goto(`${ORG}/avaliacao/sec-acessos/q-mfa?as=rui`)
  await expect(page.getByText('A avaliação já foi submetida. As respostas já não podem ser alteradas.')).toBeVisible()
})

test('Assessment — the home page shows the real progress and continues where Rui stopped', async ({ page }) => {
  await start(page, `${ORG}/inicio`, 'rui')
  await expect(page.getByRole('heading', { name: '34 de 41 perguntas respondidas' })).toBeVisible()
  await expect(page.getByText('1 pergunta atribuída a Pedro Almeida')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar avaliação →' }).click()
  await expect(page).toHaveURL(/\/avaliacao\/sec-acessos\/q-acessos-wifi$/)
  await expect(page.getByRole('heading', { level: 2, name: /Wi-Fi para visitantes/ })).toBeVisible()
})
