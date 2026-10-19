import { ApiError, type AssessmentApi, type AssessmentQuestion, type DemoActor, type Id, type Task } from '../contracts'
import { shortDayPt } from './dates'
import { notify } from './notify'
import type { DemoState } from './seed'
import { auditEntry, getState, newId, now, setState, simulate } from './store'

/** Maturity assessment sections. */
const SECTIONS: Array<{ id: Id; name: string }> = [
  { id: 'sec-gov', name: 'Governação e responsabilidades' },
  { id: 'sec-ativos', name: 'Gestão de ativos' },
  { id: 'sec-acessos', name: 'Controlo de acessos' },
  { id: 'sec-continuidade', name: 'Continuidade do negócio' },
  { id: 'sec-incidentes', name: 'Gestão de incidentes' },
  { id: 'sec-fornecedores', name: 'Fornecedores e cadeia de abastecimento' },
]

type QuestionDef = Omit<AssessmentQuestion, 'answer' | 'delegatedTaskId'>
const q = (sectionId: Id, id: Id, text: string, explanation: string, example: string, whyItMatters: string): QuestionDef => ({ id, sectionId, text, explanation, example, whyItMatters })

/**
 * Questionnaire catalog (mock). The explanation, example and "why it matters" stand in for the AI help that
 * the real service pre-generates per question (informational only). The answers live in DemoState.answers or in the analyst's task.
 */
const QUESTIONS: QuestionDef[] = [
  q('sec-gov', 'q-gov-politica', 'A empresa tem uma política de segurança da informação aprovada pela gerência?',
    'Um documento curto que diz como a empresa protege a informação e quem é responsável. Conta se foi aprovado e comunicado a todos.',
    'Duas páginas assinadas pela gerência, enviadas por email a todos e afixadas na sala de pausa.',
    'Sem regras escritas, cada pessoa faz à sua maneira. A NIS2 pede políticas aprovadas pela gestão.'),
  q('sec-gov', 'q-gov-responsavel', 'Está designado um responsável pela cibersegurança, com tempo e meios para o fazer?',
    'Uma pessoa que responde pela cibersegurança perante a gerência e o CNCS, com tempo reservado para isso.',
    'O diretor administrativo dedica meio dia por semana à segurança e tem apoio de uma consultora externa.',
    'A NIS2 obriga a nomear este responsável. Sem ele, ninguém acompanha os riscos nem os prazos.'),
  q('sec-gov', 'q-gov-gerencia', 'A gerência acompanha a cibersegurança pelo menos uma vez por ano?',
    'A gerência olha para os riscos, os incidentes e o plano de ação, e decide o que fazer a seguir.',
    'Uma reunião em janeiro onde se revêem os incidentes do ano e se aprova o orçamento de segurança.',
    'A lei torna a gerência responsável pelas falhas de segurança. Acompanhar é a forma de cumprir essa responsabilidade.'),
  q('sec-gov', 'q-gov-formacao-gerencia', 'Os membros da gerência receberam formação em cibersegurança?',
    'Quem gere a empresa sabe o suficiente para aprovar e supervisionar as medidas de segurança.',
    'Os sócios-gerentes fizeram um curso online de quatro horas sobre riscos e obrigações da NIS2.',
    'O Decreto-Lei 125/2025 exige esta formação à gestão. Sem ela, é difícil decidir onde investir.'),
  q('sec-gov', 'q-gov-formacao', 'Os colaboradores recebem formação regular sobre segurança, por exemplo a reconhecer phishing?',
    'Todas as pessoas que usam computadores aprendem os cuidados básicos e relembram-nos com regularidade.',
    'Uma sessão anual de uma hora sobre emails falsos, com uma folha de presenças assinada.',
    'A maioria dos ataques começa com um email enganador. Uma pessoa atenta trava muitos deles.'),
  q('sec-gov', 'q-gov-riscos', 'A empresa identifica e revê os riscos de cibersegurança de forma periódica?',
    'A empresa sabe o que de pior pode acontecer aos seus sistemas e volta a pensar nisso de tempos a tempos.',
    'Uma lista com os cinco riscos mais importantes, como ficar sem o ERP, revista uma vez por ano.',
    'Sem conhecer os riscos, o dinheiro vai para o sítio errado. A NIS2 pede uma análise de riscos.'),
  q('sec-gov', 'q-gov-funcoes', 'As responsabilidades de segurança estão definidas para cada função?',
    'Cada tarefa de segurança tem alguém responsável e essa pessoa sabe que é dela.',
    'O técnico faz as cópias de segurança, a gerente aprova os acessos novos e o responsável trata os incidentes.',
    'Quando ninguém sabe de quem é a tarefa, ela fica por fazer.'),
  q('sec-gov', 'q-gov-revisao', 'As medidas de segurança são revistas quando há mudanças importantes na empresa?',
    'Sempre que algo grande muda, a empresa confirma se as medidas de segurança ainda chegam.',
    'Ao mudar para um ERP na nuvem, revê-se quem tem acesso e onde ficam as cópias de segurança.',
    'Uma mudança pode abrir falhas novas que as medidas antigas não cobrem.'),

  q('sec-ativos', 'q-ativos-inventario', 'Existe um inventário atualizado dos equipamentos, sistemas e aplicações da empresa?',
    'Uma lista de tudo o que a empresa usa: computadores, servidores, rede, programas e serviços na nuvem.',
    'A lista de ativos do aLinha, com os portáteis, o servidor de produção e o ERP, conta como inventário se estiver completa.',
    'Não se protege o que não se conhece. É o ponto de partida para avaliar os riscos.'),
  q('sec-ativos', 'q-ativos-dono', 'Cada ativo importante tem um responsável identificado?',
    'A pessoa que sabe para que serve o ativo e decide sobre ele, não necessariamente quem o mantém.',
    'O ERP pertence ao diretor financeiro, mesmo que seja o fornecedor a fazer as atualizações.',
    'Sem um responsável, ninguém decide quem pode aceder nem o que fazer se o ativo falhar.'),
  q('sec-ativos', 'q-ativos-criticidade', 'Os ativos estão classificados pela importância para o negócio?',
    'Saber que ativos fazem parar a empresa se falharem, e quais podem esperar.',
    'O servidor de produção é crítico; a impressora do escritório é pouco importante.',
    'Ajuda a proteger primeiro o que mais importa, com o orçamento que existe.'),
  q('sec-ativos', 'q-ativos-dados', 'Sabe onde estão guardados os dados mais sensíveis, como os de clientes e colaboradores?',
    'As pastas, servidores ou serviços na nuvem onde ficam os dados pessoais e confidenciais.',
    'Os recibos de vencimento estão numa pasta do servidor; os contactos dos clientes estão no CRM.',
    'O RGPD obriga a proteger os dados pessoais. Só se protege bem o que se sabe onde está.'),
  q('sec-ativos', 'q-ativos-abate', 'Os equipamentos são apagados de forma segura antes de serem abatidos ou vendidos?',
    'Antes de um disco ou portátil sair da empresa, os dados são apagados de forma a não poderem ser recuperados.',
    'O técnico usa uma ferramenta de apagamento seguro antes de vender os portáteis antigos. Formatar não chega.',
    'Um portátil vendido com dados de clientes é uma violação do RGPD.'),
  q('sec-ativos', 'q-ativos-software', 'Só é instalado software autorizado nos computadores da empresa?',
    'Os programas nos computadores foram aprovados por quem gere a informática.',
    'Os colaboradores não têm permissão para instalar programas e pedem ao técnico quando precisam.',
    'Programas descarregados da internet são uma das formas mais comuns de entrar malware.'),

  q('sec-acessos', 'q-acessos-contas', 'Cada pessoa tem a sua própria conta, sem contas partilhadas?',
    'Cada pessoa entra nos sistemas com o seu nome de utilizador e a sua senha.',
    'Na receção, cada pessoa do turno entra com a sua conta, em vez de uma conta "rececao" comum.',
    'Com contas partilhadas não se consegue saber quem fez o quê, nem retirar o acesso a uma só pessoa.'),
  q('sec-acessos', 'q-acessos-saidas', 'Os acessos são retirados no dia em que um colaborador sai da empresa?',
    'Quando alguém sai, todas as contas dessa pessoa são desativadas no próprio dia.',
    'No último dia, os recursos humanos avisam o técnico, que desativa o email, a VPN e o ERP.',
    'Contas esquecidas de ex-colaboradores são uma porta aberta, muitas vezes sem ninguém dar por isso.'),
  q('sec-acessos', 'q-acessos-minimo', 'Cada pessoa só tem acesso ao que precisa para o seu trabalho?',
    'As pessoas veem e alteram apenas a informação de que precisam para a sua função.',
    'Quem está na produção não acede às pastas dos recursos humanos.',
    'Se uma conta for roubada, o atacante só chega ao que essa pessoa podia ver.'),
  q('sec-acessos', 'q-acessos-revisao', 'Os acessos são revistos pelo menos uma vez por ano?',
    'Uma verificação simples de quem tem acesso a quê e se ainda precisa.',
    'Em dezembro, cada chefe de equipa confirma a lista de acessos da sua equipa e pede para retirar o que sobra.',
    'Com o tempo, as pessoas acumulam acessos de que já não precisam.'),
  q('sec-acessos', 'q-acessos-senhas', 'Existem regras para as senhas, como um comprimento mínimo?',
    'A empresa define como devem ser as senhas e os sistemas obrigam a cumprir essas regras.',
    'Pelo menos 12 caracteres e nunca reutilizar a senha de outro serviço.',
    'Senhas curtas ou repetidas são adivinhadas ou reaproveitadas de fugas de dados noutros sites.'),
  q('sec-acessos', 'q-acessos-admin', 'As contas de administrador são usadas só para tarefas de administração?',
    'Quem administra os sistemas tem duas contas: uma normal para o dia a dia e outra só para administrar.',
    'O técnico lê o email com a conta normal e só usa a conta de administrador para instalar programas.',
    'Se um email malicioso for aberto com uma conta de administrador, o atacante fica com controlo total.'),
  q('sec-acessos', 'q-mfa', 'As contas de administrador usam autenticação multifator (MFA)?',
    'MFA é pedir uma segunda prova além da senha, por exemplo um código no telemóvel.',
    'Ao entrar no Microsoft 365 como administrador, além da senha é preciso aprovar o pedido na app do telemóvel.',
    'Trava a maioria dos ataques com senhas roubadas. A NIS2 refere a autenticação multifator de forma explícita.'),
  q('sec-acessos', 'q-acessos-remoto', 'O acesso remoto à rede da empresa é feito de forma segura, por exemplo por VPN?',
    'Quem trabalha de fora, incluindo os fornecedores, entra na rede por uma ligação protegida.',
    'O fornecedor do ERP liga-se por VPN com a sua própria conta, em vez de um programa de acesso remoto sempre ligado.',
    'Acessos remotos mal protegidos são uma das portas de entrada mais usadas pelo ransomware.'),
  q('sec-acessos', 'q-acessos-wifi', 'A rede Wi-Fi para visitantes está separada da rede da empresa?',
    'Os visitantes não devem conseguir chegar aos servidores nem aos computadores da empresa.',
    'Há uma rede "Visitantes" que só dá acesso à internet, diferente da rede onde estão os servidores.',
    'Um equipamento infetado de um visitante não deve conseguir espalhar-se pela rede da empresa.'),

  q('sec-continuidade', 'q-backups', 'As cópias de segurança dos sistemas críticos são feitas regularmente e a reposição é testada?',
    'Não basta fazer cópias: é preciso experimentar repor os dados para ter a certeza de que funcionam.',
    'Uma vez por mês, o técnico repõe uma pasta a partir da cópia e confirma que os ficheiros abrem.',
    'Muitas empresas só descobrem que as cópias não funcionam no dia em que precisam delas.'),
  q('sec-continuidade', 'q-cont-copia-fora', 'Existe uma cópia de segurança guardada fora das instalações ou desligada da rede?',
    'Pelo menos uma cópia dos dados fica longe da empresa ou sem ligação aos sistemas.',
    'Um disco que o técnico desliga depois de cada cópia e guarda noutro edifício, ou uma cópia num serviço na nuvem.',
    'Protege contra incêndios e contra ransomware, que costuma cifrar também as cópias ligadas à rede.'),
  q('sec-continuidade', 'q-cont-plano', 'Existe um plano escrito para continuar a trabalhar se um sistema crítico falhar?',
    'Um documento que diz o que fazer, por que ordem e quem decide quando um sistema importante para.',
    'Se o ERP parar, as encomendas passam a ser registadas numa folha e o fornecedor é chamado de imediato.',
    'Numa crise não há tempo para pensar. Um plano evita decisões à pressa e paragens longas.'),
  q('sec-continuidade', 'q-cont-tempo', 'Sabe quanto tempo a empresa aguenta sem cada serviço crítico?',
    'Para cada serviço importante, a empresa sabe ao fim de quanto tempo a paragem começa a causar danos sérios.',
    'A faturação pode parar um dia, mas a produção só aguenta algumas horas.',
    'Diz que serviços repor primeiro e quanto vale a pena investir em cópias e alternativas.'),
  q('sec-continuidade', 'q-cont-energia', 'Os equipamentos críticos estão protegidos contra cortes de energia?',
    'Os servidores e a rede continuam ligados, ou desligam-se em segurança, se faltar a luz.',
    'Uma UPS dá ao servidor dez minutos para gravar o trabalho e desligar sem perder dados.',
    'Um corte de energia pode estragar discos e corromper as bases de dados.'),
  q('sec-continuidade', 'q-cont-contactos', 'Há uma lista de contactos de emergência, como fornecedores, técnicos e seguradora?',
    'Os números de quem ajuda numa crise estão reunidos e acessíveis mesmo sem os sistemas da empresa.',
    'Uma folha impressa no gabinete da gerência com os contactos do técnico, do fornecedor do ERP e da seguradora.',
    'Se os computadores pararem, os contactos guardados neles também deixam de estar disponíveis.'),
  q('sec-continuidade', 'q-cont-teste', 'O plano de continuidade é testado pelo menos uma vez por ano?',
    'A equipa experimenta o plano para confirmar que funciona e que todos sabem o seu papel.',
    'Um exercício de uma hora à mesa: "o servidor de produção avariou, o que fazemos?"',
    'Um plano nunca testado costuma falhar nos pormenores, como um contacto errado ou um passo esquecido.'),

  q('sec-incidentes', 'q-inc-procedimento', 'Existe um procedimento para quando acontece um incidente de segurança?',
    'Passos escritos sobre quem contactar, o que fazer primeiro e como guardar provas.',
    'Desligar da rede o computador afetado, avisar o responsável e não apagar nada até a situação ser analisada.',
    'As primeiras horas decidem o tamanho do estrago. A NIS2 exige que os incidentes sejam tratados.'),
  q('sec-incidentes', 'q-inc-reportar', 'Os colaboradores sabem a quem comunicar um email ou comportamento suspeito?',
    'Existe uma pessoa ou endereço que todos conhecem para avisar, sem receio de ser culpados.',
    'Um endereço como seguranca@empresa.pt, lembrado na formação anual e afixado junto aos computadores.',
    'Um aviso rápido de um colaborador pode travar um ataque antes de se espalhar.'),
  q('sec-incidentes', 'q-inc-cncs', 'Sabe que os incidentes significativos têm de ser notificados ao CNCS em 24 horas?',
    'Quando um incidente afeta muito o serviço, a empresa tem de avisar o Centro Nacional de Cibersegurança dentro de prazos curtos.',
    'Um ransomware para a produção na terça de manhã: o alerta inicial segue até quarta de manhã e a notificação completa até sexta.',
    'A NIS2 obriga a um alerta inicial em 24 horas e a uma notificação completa em 72 horas. Falhar os prazos pode dar coima.'),
  q('sec-incidentes', 'q-inc-registo', 'Os incidentes ficam registados, mesmo os pequenos?',
    'Cada incidente fica anotado: o que aconteceu, quando e o que se fez.',
    'Uma folha partilhada onde se anota o portátil com vírus em março e o email falso aberto em maio.',
    'O registo ajuda a perceber o que se repete e serve de prova perante o CNCS.'),
  q('sec-incidentes', 'q-inc-antivirus', 'Todos os computadores e servidores têm proteção contra malware atualizada?',
    'Cada computador e servidor tem um antivírus ou EDR ativo, que se atualiza sozinho.',
    'O Microsoft Defender está ligado em todos os portáteis e o técnico confirma no painel que estão atualizados.',
    'Um só computador sem proteção pode ser a porta de entrada para toda a rede.'),
  q('sec-incidentes', 'q-inc-registos', 'Os registos (logs) dos sistemas críticos são guardados e consultados?',
    'Os sistemas importantes guardam um histórico de quem entrou e do que aconteceu, e alguém olha para ele.',
    'O servidor guarda as entradas e saídas durante seis meses e o técnico revê os alertas todas as semanas.',
    'Sem registos não se consegue perceber o que aconteceu depois de um incidente, nem explicá-lo ao CNCS.'),

  q('sec-fornecedores', 'q-forn-lista', 'Tem uma lista dos fornecedores com acesso aos sistemas ou aos dados da empresa?',
    'Saber que empresas externas conseguem entrar nos sistemas ou tratam dados da empresa.',
    'A empresa de informática, o fornecedor do ERP e o serviço de email.',
    'Muitos ataques entram por um fornecedor. A NIS2 pede atenção à cadeia de abastecimento.'),
  q('sec-fornecedores', 'q-forn-contratos', 'Os contratos com esses fornecedores incluem cláusulas de segurança?',
    'Os contratos dizem o que o fornecedor tem de fazer para proteger a informação da empresa.',
    'Confidencialidade, aviso em 24 horas em caso de incidente e um acordo de tratamento de dados (RGPD).',
    'Sem isto no contrato, é difícil exigir ao fornecedor que avise ou que corrija uma falha.'),
  q('sec-fornecedores', 'q-forn-acessos', 'Os acessos dos fornecedores são controlados e retirados quando deixam de ser precisos?',
    'Os fornecedores só entram quando precisam e as contas deles são fechadas no fim do trabalho.',
    'O acesso remoto do técnico externo só é ligado durante a intervenção e desligado a seguir.',
    'Acessos de fornecedores sempre ligados são um alvo fácil para os atacantes.'),
  q('sec-fornecedores', 'q-forn-avaliacao', 'Avalia a segurança dos fornecedores críticos antes de os contratar?',
    'Antes de escolher um fornecedor importante, a empresa confirma se ele protege bem a informação.',
    'Pedir ao novo fornecedor de cloud que responda a um questionário curto ou mostre o certificado ISO 27001.',
    'Quando um fornecedor é atacado, os dados da empresa podem ir com ele.'),
  q('sec-fornecedores', 'q-forn-cloud', 'Sabe em que país ficam os dados guardados em serviços na nuvem?',
    'Para cada serviço na nuvem, a empresa sabe se os dados ficam na União Europeia ou fora dela.',
    'O email está no Microsoft 365 com dados na UE; a ferramenta de inquéritos guarda os dados nos EUA.',
    'Importa para o RGPD: os dados fora da União Europeia têm regras próprias.'),
]

const CHOICE_LABEL = { sim: 'Sim', parcial: 'Em parte', nao: 'Não', nao_sei: 'Não sei' } as const

/** Latest analyst task for a question, unless it was cancelled. */
const delegation = (s: DemoState, questionId: Id) => s.tasks.findLast((t) => t.questionId === questionId && t.status !== 'cancelada')

/** The designated manager's own answer wins; otherwise the analyst's, once they reply. */
function withAnswer(s: DemoState, org: Id, question: QuestionDef): AssessmentQuestion {
  const task = delegation(s, question.id)
  const delegatedAnswer = task?.status === 'concluida' ? task.answer ?? null : null
  return { ...question, answer: s.answers[org]?.[question.id] ?? delegatedAnswer, delegatedTaskId: task?.id ?? null }
}

export function createAssessmentMock(getActor: () => DemoActor): Pick<AssessmentApi, 'getAssessment' | 'answerQuestion' | 'listQuestions' | 'saveAnswer' | 'delegateQuestion'> {
  const role = (s: DemoState) => s.users.find((u) => u.id === getActor().userId)?.role
  const findQuestion = (id: Id) => {
    const question = QUESTIONS.find((x) => x.id === id)
    if (!question) throw new ApiError('Pergunta não encontrada', 404)
    return question
  }
  const assertOpen = (s: DemoState, org: Id) => {
    if (s.roadmap[org]?.assessmentCompletedAt) throw new ApiError('A avaliação já foi submetida e não pode ser alterada.', 409)
  }

  return {
    getAssessment: (org) => simulate(() => {
      const s = getState()
      if (role(s) === 'analista') throw new ApiError('Não tem permissão para ver a avaliação.', 403)
      const roadmap = s.roadmap[org]
      const done = !!roadmap?.assessmentCompletedAt
      const sections = SECTIONS.map((sec) => {
        const questions = QUESTIONS.filter((x) => x.sectionId === sec.id).map((x) => withAnswer(s, org, x))
        const tasks = questions.map((x) => delegation(s, x.id)).filter((t): t is Task => !!t)
        return {
          ...sec,
          total: questions.length,
          answered: done ? questions.length : questions.filter((x) => x.answer).length,
          delegated: tasks.map((t) => ({ taskId: t.id, assigneeId: t.assigneeId, status: t.status })),
        }
      })
      // Questions waiting for an analyst are skipped: the designated manager continues with the rest.
      const next = done ? undefined : QUESTIONS.find((x) => { const question = withAnswer(s, org, x); return !question.answer && !question.delegatedTaskId })
      return {
        status: roadmap?.validated ? 'validada' : done ? 'submetida' : 'em_curso', sections, maturity: roadmap?.validated ? 2 : null,
        nextQuestion: next ? { sectionId: next.sectionId, questionId: next.id } : null,
      }
    }),

    listQuestions: (org, sectionId) => simulate(() => {
      const s = getState()
      if (role(s) === 'analista') throw new ApiError('Não tem permissão para ver a avaliação.', 403)
      if (!SECTIONS.some((x) => x.id === sectionId)) throw new ApiError('Secção não encontrada', 404)
      return QUESTIONS.filter((x) => x.sectionId === sectionId).map((x) => withAnswer(s, org, x))
    }),

    saveAnswer: (org, questionId, answer) => simulate(() => {
      const s = getState()
      if (role(s) !== 'responsavel') throw new ApiError('Só o Responsável designado responde à avaliação.', 403)
      const question = findQuestion(questionId)
      if (!answer.choice) throw new ApiError('Escolha uma resposta.', 422)
      assertOpen(s, org)
      const saved = { choice: answer.choice, note: answer.note?.trim() || undefined }
      setState((st) => {
        const before = st.answers[org]?.[questionId] ?? null
        const entry = auditEntry({ organizationId: org, userId: getActor().userId, action: before ? 'update' : 'answer', entityType: 'assessment', entityId: questionId, summary: `Respondeu "${CHOICE_LABEL[saved.choice]}" à pergunta "${question.text}"`, before: before && { choice: before.choice }, after: { choice: saved.choice } })
        return { ...st, answers: { ...st.answers, [org]: { ...st.answers[org], [questionId]: saved } }, audit: [...st.audit, entry] }
      })
      return withAnswer(getState(), org, question)
    }),

    delegateQuestion: (org, questionId, input) => simulate(() => {
      const s = getState()
      if (role(s) !== 'responsavel') throw new ApiError('Só o Responsável designado pode delegar perguntas.', 403)
      const question = findQuestion(questionId)
      assertOpen(s, org)
      const member = s.members.find((m) => m.organizationId === org && m.userId === input.assigneeId && m.status === 'ativo' && m.role === 'analista')
      if (!member) throw new ApiError('Escolha um analista ativo da equipa.', 422)
      if (input.dueDate && input.dueDate < s.today) throw new ApiError('O prazo não pode ser no passado.', 422)
      if (delegation(s, questionId)?.status === 'pendente') throw new ApiError('Esta pergunta já foi delegada e está à espera de resposta.', 409)
      const o = s.organizations.find((x) => x.id === org)!
      const me = s.users.find((u) => u.id === getActor().userId)!
      const section = SECTIONS.find((x) => x.id === question.sectionId)!
      const task: Task = {
        id: newId('task'), organizationId: org, kind: 'pergunta', questionId, title: question.text, context: `Avaliação de maturidade · ${section.name}`,
        // US33: the analyst gets the same AI help the designated manager sees.
        aiHelp: `${question.explanation} Exemplo: ${question.example}`,
        assigneeId: member.userId!, assignedBy: me.id, dueDate: input.dueDate, status: 'pendente', createdAt: now(),
      }
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'assign', entityType: 'task', entityId: task.id, summary: `Delegou a ${member.name} a pergunta "${question.text}"`, before: null, after: { assigneeId: task.assigneeId, dueDate: task.dueDate } })
      setState((st) => notify({ ...st, tasks: [...st.tasks, task], audit: [...st.audit, entry] }, {
        organizationId: org, userId: task.assigneeId, kind: 'tarefa', title: `Nova pergunta técnica de ${me.name}`,
        body: `${question.text}${input.dueDate ? ` · até ${shortDayPt(input.dueDate)}` : ' · sem prazo'}`, link: `/org/${o.slug}/tarefas/${task.id}/pergunta`,
      }))
      return task
    }),

    answerQuestion: (org, taskId, answer) => simulate(() => {
      if (!answer.choice) throw new ApiError('Escolha uma resposta.', 422)
      let saved = getState().tasks.find((t) => t.id === taskId)
      if (!saved || saved.kind !== 'pergunta') throw new ApiError('Pergunta não encontrada', 404)
      if (saved.assigneeId !== getActor().userId) throw new ApiError('Esta pergunta não lhe foi atribuída.', 403)
      setState((s) => {
        const t = s.tasks.find((x) => x.id === taskId)!
        const me = s.users.find((u) => u.id === getActor().userId)!
        saved = { ...t, status: 'concluida', answer: { choice: answer.choice, note: answer.note?.trim() || undefined } }
        const label = CHOICE_LABEL[answer.choice]
        const entry = auditEntry({ organizationId: org, userId: me.id, action: 'answer', entityType: 'task', entityId: taskId, summary: `Respondeu à pergunta técnica: ${label}`, before: { status: t.status }, after: { status: 'concluida', choice: answer.choice } })
        return notify({ ...s, tasks: s.tasks.map((x) => (x.id === taskId ? saved! : x)), audit: [...s.audit, entry] }, {
          organizationId: org, userId: t.assignedBy, kind: 'tarefa_concluida', title: `${me.name.split(' ')[0]} respondeu à pergunta técnica`,
          body: `${label}${answer.note?.trim() ? `: "${answer.note.trim()}"` : ''}`, link: '/org/componentes-agueda/avaliacao',
        })
      })
      return saved!
    }),
  }
}
