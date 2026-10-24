# aLinha — protótipo do plugin Riscos e Ativos

Protótipo de muito alta fidelidade (MS3 · UX) do plugin **Riscos e Ativos** do aLinha, para demonstração aos orientadores e testes de usabilidade. Corre só no browser, com dados simulados; a camada de dados está preparada para ligar à API real (core Kotlin / Spring Modulith).

## Correr

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc + build de produção
npm run lint
npm test             # Vitest (regra de risco, permissões, roadmap, contraste, API mock)
npx playwright install chromium
npm run test:e2e     # Playwright: 3 cenários + acessibilidade (axe) + assistente, desktop 1440×900 e mobile 390×844
```

Os screenshots do Playwright ficam em `e2e/__screenshots__/{desktop,mobile}/`.

> Se, com muitos workers, aparecerem falhas aleatórias por timeout (páginas que demoram a renderizar), corra com menos paralelismo: `npx playwright test --workers=3`. Os mesmos testes passam quando corridos com menos carga.

## Trocar de persona

- Botão **Demo · Nome** no canto inferior esquerdo (no mobile, por cima da tab bar), ou **Alt+P**.
- Ou na URL: `?as=rui`, `?as=pedro`, `?as=marta`.
- No mesmo menu: **Saltar para** um cenário, **Repor dados de demonstração** e **Simular falha de ligação** (mostra os estados de erro).

| Persona | Papel | Começa em |
|---|---|---|
| Rui Santos | Responsável designado | `/org/componentes-agueda/inicio` |
| Pedro Almeida | Analista | `/org/componentes-agueda/tarefas` |
| Marta Ferreira | Consultora | `/carteira` |

## Guião da demonstração

No menu de persona (canto inferior, Alt+P) escolha **Guião da demonstração**: três histórias com botões "Ir" que mudam de persona, repõem os dados e abrem o ecrã certo. Cada ecrã tem ainda um painel "Como funciona este ecrã" e termos sublinhados com explicação.

## Rotas por cenário

Os painéis e modais abrem por parâmetro de URL, por isso todos os estados são partilháveis.

**Cenário 1 — Inventário (Rui → Pedro)** · dados: *Cenário 1 · início*
| Ecrã | Rota |
|---|---|
| 07 Ativos (Rui) | `/org/componentes-agueda/ativos` |
| 07b Atribuir registo | `/org/componentes-agueda/ativos?atribuir=1` |
| Adicionar / detalhe de ativo | `…/ativos?novo=1` · `…/ativos?ativo=ast-erp` |
| Serviços críticos · Exportar Lista de Ativos | `…/ativos?servicos=1` · `…/ativos?exportar=1` |
| Filtros | `…/ativos?q=nas&crit=alto&type=servidor` |
| 09 As minhas tarefas (Pedro) | `/org/componentes-agueda/tarefas` |
| 11 Registar ativos técnicos (Pedro) | `/org/componentes-agueda/tarefas/task-ativos/ativos` |
| 10 Pergunta técnica com ajuda da IA (Pedro) | `/org/componentes-agueda/tarefas/task-pergunta-mfa/pergunta` |
| Avaliação: progresso por secção (Rui) | `/org/componentes-agueda/avaliacao` |
| Avaliação: perguntas de uma secção | `/org/componentes-agueda/avaliacao/sec-acessos` |
| Avaliação: responder, guardar ou delegar ao Pedro | `/org/componentes-agueda/avaliacao/sec-acessos/q-acessos-wifi` |
| Equipa: lembrar, mudar prazo, cancelar | `/org/componentes-agueda/equipa` |
| Importar de Excel (CSV) · vista por serviço | `…/ativos?importar=1` · `…/ativos?vista=servicos` |
| Integrações (Rui pede ao Pedro, Pedro liga) | `/org/componentes-agueda/integracoes` |

**Cenário 2 — Registo de riscos (Marta)** · dados: *Cenário 2 · início*
| Ecrã | Rota |
|---|---|
| Carteira de clientes | `/carteira` |
| Visão geral do cliente | `/clientes/componentes-agueda/visao-geral` |
| Inventário com "Registar risco" | `/clientes/componentes-agueda/ativos` |
| Registo de riscos + matriz 3×3 | `/clientes/componentes-agueda/riscos` (filtro da matriz: `?p=2&i=3`) |
| Novo risco sobre um ativo | `/clientes/componentes-agueda/riscos?novo=1&ativo=ast-servidor` |
| Roadmap antes/depois + validar | `/clientes/componentes-agueda/roadmap` |
| Histórico | `/clientes/componentes-agueda/historico` |
| Matriz depois das ações · arquivados | `…/riscos?matriz=residual` · `…/riscos?arquivados=1` |
| Evidências automáticas | `/clientes/componentes-agueda/integracoes` |

**Cenário 3 — Rui depois da validação** · dados: *Cenário 3 · roadmap validado*
| Ecrã | Rota |
|---|---|
| Início com cartão "Riscos" | `/org/componentes-agueda/inicio` |
| Ativos com o risco mais alto | `/org/componentes-agueda/ativos` |
| Riscos (só leitura, linguagem simples) | `/org/componentes-agueda/riscos` |

Design system: `/_design`.

## Assistente de IA (US18 · US03 · US06)

| User story | Persona | Onde | Estado |
|---|---|---|---|
| US18 Pedir rascunho de política ao assistente | Rui | `/org/componentes-agueda/inicio` → botão "Pergunta à Alinha" → "Criar rascunho da política de segurança" | Implementada (respostas simuladas) |
| US03 Editar e aprovar rascunho de política | Marta | Notificação "Resposta do assistente para rever" → `/clientes/componentes-agueda/visao-geral?chat=<id>` → responder → **Marcar como revisto** | Implementada |
| US06 Preparar notificações de incidente com IA | Marta | Assistente → **Nova conversa** | **Parcial**: a Marta já tem conversas próprias em que é o "user" e a IA responde (sem ir para revisão), mas a resposta ainda é o texto de exemplo; falta gerar os rascunhos de notificação |

Fluxo de demonstração (US18 → US03): o Rui pede um rascunho; a conversa fica **à espera de aprovação** e a Marta é notificada; a Marta responde e marca como revisto; o Rui recebe a notificação e vê a resposta rotulada **Consultora** (as da IA aparecem como **Assistente IA**). Depois da revisão, a Marta mantém a conversa em só leitura até ao momento da revisão. Os pedidos que mencionam rascunho, política, incidente, notificação, CNPD ou relatório vão para revisão (regra provisória em `GlobalChatWidget`; não se aplica à consultora).

### Conversas da consultora: próprias vs. de clientes

Cada conversa guarda o seu dono (`ownerId`, o `userId` do servidor). O widget compara-o com o utilizador atual (`senderId`):

- **Conversa de um cliente** (`canReview` e `ownerId` ≠ utilizador): modo "a rever". Aparece o aviso "Está a ajudar um cliente", o campo "Escreva a sua resposta ao cliente…", o botão **Marcar como revisto**, e o que a Marta escreve é enviado como resposta da **Consultora** (lado do assistente, sem chamar a IA).
- **Conversa própria** (nova ou com o seu `ownerId`): comportamento normal. A Marta é o "user", a IA responde e a conversa nunca fica à espera de revisão.

### Perguntas pré-feitas do Rui

Definidas em `PERSONA_SUGGESTIONS` (`src/app/GlobalChatWidget.tsx`); as respostas são simuladas em `src/api/mock/chatMock.ts`.

| Pergunta | Resposta | Revisão |
|---|---|---|
| Criar rascunho da política de segurança | Resposta de exemplo | Sim (fica à espera da consultora) |
| Quais são as minhas responsabilidades? | Texto com as responsabilidades de um CISO na NIS2 (governação, gestão de risco, medidas técnicas, cadeia de fornecimento, incidentes, formação, evidências), marcado como indicativo | Não |
| Quais são os prazos legais se sofrermos um ciberataque? | **Tabela** (abaixo) | Não |

Resposta em tabela:

| Fase da notificação | Entidade destinatária | Prazo legal máximo |
|---|---|---|
| Alerta inicial | CNCS (MyCiber) | 24 horas após deteção |
| Notificação de dados | CNPD (se aplicável) | 72 horas após deteção |
| Atualização do incidente | CNCS (MyCiber) | 72 horas após deteção |

Notas:
- A tabela chega ao frontend como dado estruturado, não como texto: `table: { caption?, columns, rows }` (tipo `ChatTable`), na mensagem do assistente. O `ChatThread` desenha-a como `<table>` real, com `<caption>` (nome acessível) e `<th scope>`; o texto das células quebra linha, por isso não precisa de scroll no painel pequeno.
- A tabela segue o formato pedido e **não inclui o relatório final** previsto na NIS2; confirmar o conteúdo e os prazos com a consultora/fonte legal antes de usar fora da demonstração.
- Teste E2E: "Rui pergunta pelos prazos legais e recebe uma tabela" (`e2e/chatbot.spec.ts`).

### Modo expandido (ecrã inteiro)

- O botão de expandir no cabeçalho do assistente passa o painel a **ecrã inteiro** (`fixed inset-0`), com as conversas na barra lateral esquerda. Em ecrãs pequenos volta aos separadores. Esc ou **Minimizar** fecham-no; **Reduzir** volta ao painel normal.
- Na barra lateral da app (desktop) há o botão **Assistente IA**, que abre o assistente **já em ecrã inteiro**. O botão flutuante continua a abrir o painel pequeno.
- Qualquer parte da app pode abrir o assistente com `openChat()` ou `openExpandedChat()` (`src/features/chatbot/chatControl.ts`): é um evento de janela, por isso não precisa de contexto nem de props.
- Em mobile o botão flutuante fica acima do seletor de persona e da tab bar, e o painel aberto fica por cima de ambos.

## Arquitetura

```
src/
├── api/            contratos (AssetsApi, AssessmentApi, AuditApi, DirectoryApi), hooks TanStack Query, mock
│   └── mock/       implementação em memória, latência 200–600 ms, localStorage, auditoria em cada escrita
├── core/           sessão/persona, RBAC (canRole/useCan), tenant, seletor de persona
├── config/         matriz de risco (D2), flags (D3), etiquetas e datas em pt-PT
├── features/
│   ├── assets/     inventário, serviços, tarefas do analista, registo de riscos (plugin Riscos e Ativos)
│   ├── assessment/ roadmap mínimo e prioritizeRoadmap (plugin Avaliação)
│   ├── assessment/ também o resumo da avaliação (ecrã do Rui)
│   ├── chatbot/    assistente flutuante, conversas por organização, fluxo de revisão pela consultora (US18/US03), respostas com tabela, modo ecrã inteiro e chatControl
│   ├── assessment/ também o questionário do Rui: resumo, secções, perguntas e delegação ao analista
│   ├── integrations/ catálogo só de leitura, sugestões de ativos, evidências (RF37)
│   ├── home/  portfolio/  tasks/  team/
├── ui/             design system (tokens em src/index.css)
└── app/            router, layouts por persona, guardas, composição entre plugins
```

- **Trocar para a API real:** escrever `createHttpApi()` que cumpra `src/api/contracts.ts` e usá-la em `src/api/client.ts`. Os componentes só usam `src/api/queries.ts`; o ESLint proíbe importar o mock.
- **Isolamento entre plugins:** `features/assets` e `features/assessment` só se importam através de `public.ts` (regra `no-restricted-imports`). O roadmap recebe os riscos como sinais `{actionId, level, riskLabel}` em `app/ConsultantRoadmap.tsx`.
- **Nível de risco:** só `computeRiskLevel()` o calcula; nunca é guardado nem escolhido à mão.
- **RBAC:** regras em `src/core/rbac.ts`, aplicadas nos ecrãs (`Guard`, `useCan`) e também no mock (o analista só recebe os ativos da sua tarefa; o cliente só recebe riscos depois da validação).
- **Auditoria:** cada escrita do mock gera uma entrada `audit_log` (quem, quando, o quê, antes/depois), visível no detalhe dos ativos e dos riscos e em *Histórico*.

## Decisões a confirmar

- **D1 — Tipos de ativo.** Acrescentados `armazenamento` e `sistema_producao_ot` (usados nos mockups). **O enum `assets.asset_type` do DBML tem de ser atualizado.**
- **D2 — Escala de risco.** Matriz 3×3 configurável em `src/config/riskMatrix.ts`: score = p × i, com p, i ∈ {1, 2, 3}; 1–2 baixo, 3–4 médio, 6–9 alto. Passar a 5×5 é só mudar a configuração (há um teste que o demonstra). `risk_level` deixa de ser guardado no DBML.
- **D3 — Visibilidade dos riscos para o cliente.** O Responsável designado vê o registo em só leitura depois de a consultora validar o roadmap (flag `RISKS_VISIBLE_TO_CLIENT_AFTER_VALIDATION` em `src/config/flags.ts`). O analista nunca vê riscos.
- **D4 — Localização.** Campo opcional no ativo; não existe no DBML.
- **Extras ao DBML (a confirmar):**
  - `risk.treatment` passa de texto livre a enum `mitigar | aceitar | evitar | partilhar`, mais `acceptance_justification`, `residual_probability`, `residual_impact`, `status` e `plain_language` ("O que isto significa para a empresa").
  - `task.scope` (o que registar) e `task.expected_count` na tarefa de registo de ativos.
  - Comentários da consultora sobre ativos (`asset_comment`).
  - `asset.depends_on` (dependências entre ativos) e `asset.source` (`manual | importacao | integracao`).
  - `risk.review_date`, estado `arquivado` com `archived_reason` (nunca se apaga; fica na auditoria) e risco sem ativo (toda a empresa).
  - `task.kind` += `integracao`; `task.answer` e `task.ai_help` na pergunta técnica; estado `cancelada`.
  - Respostas do Responsável designado ao questionário (`assessment_answer`: pergunta, resposta `sim | parcial | nao | nao_sei` e comentário) e `task.question_id` na pergunta delegada, para ligar a resposta do analista à pergunta.
  - Notificações (`notification`), ligações de integração (`integration_connection` com referência ao segredo no OpenBao), `discovered_asset` e `collected_evidence`.
- **Desvio visual:** o texto "✓ Feito" e outros textos a `signal` (#168C80) não passavam AA sobre branco; passaram a `brand`, com o visto em `signal`.
- **Tokens de risco novos:** `risk-low/medium/high` (+ `-ink`), sóbrios e com contraste AA testado; os níveis têm sempre ícone e texto.
- **D5 — Conversas do assistente.** Novas entidades `chat_conversation` (com `scope_key`, `topic`, `awaiting_review` e `reviewed_message_count`) e `chat_message` (com `role`, `author_id`, `source`). A consultora só vê conversas de clientes à espera de revisão ou já revistas, e só até ao momento da revisão; esta regra tem de ser aplicada no servidor. A consultora vê sempre as **suas próprias** conversas completas, e só o dono de uma conversa a pode apagar; o servidor deve devolver o `user_id` (dono) de cada conversa, porque é com ele que o frontend distingue "a rever" de "própria".
- **D6 — Respostas do assistente com tabela.** `chat_message` ganha um campo opcional `table` (JSON: `caption`, `columns`, `rows`), e `ChatReply` devolve o mesmo formato. O backend/IA deve responder com dados estruturados para o frontend os desenhar como tabela acessível, em vez de markdown ou texto livre.

## Fora do âmbito

Backend real, Keycloak/MFA, envio real de emails, integração com CNCS/MyCiber, ligação real a fornecedores (o consentimento é simulado), IA real (as respostas do assistente, incluindo a tabela de prazos, e a ajuda da pergunta técnica são texto simulado e rotulado), geração de notificações de incidente com IA (US06), questionário completo da Avaliação (só o resumo e a pergunta delegada).
