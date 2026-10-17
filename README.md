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
npm run test:e2e     # Playwright: 3 cenários + acessibilidade (axe), desktop 1440×900 e mobile 390×844
```

Os screenshots do Playwright ficam em `e2e/__screenshots__/{desktop,mobile}/`.

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
  - Notificações (`notification`), ligações de integração (`integration_connection` com referência ao segredo no OpenBao), `discovered_asset` e `collected_evidence`.
- **Desvio visual:** o texto "✓ Feito" e outros textos a `signal` (#168C80) não passavam AA sobre branco; passaram a `brand`, com o visto em `signal`.
- **Tokens de risco novos:** `risk-low/medium/high` (+ `-ink`), sóbrios e com contraste AA testado; os níveis têm sempre ícone e texto.

## Fora do âmbito

Backend real, Keycloak/MFA, envio real de emails, integração com CNCS/MyCiber, ligação real a fornecedores (o consentimento é simulado), IA nova (a ajuda da pergunta técnica é texto pré-gerado e rotulado), questionário completo da Avaliação (só o resumo e a pergunta delegada).
