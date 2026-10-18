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
const q = (sectionId: Id, id: Id, text: string, explanation: string): QuestionDef => ({ id, sectionId, text, explanation })

/** Questionnaire catalog (mock). The answers live in DemoState.answers or in the analyst's task. */
const QUESTIONS: QuestionDef[] = [
  q('sec-gov', 'q-gov-politica', 'A empresa tem uma política de segurança da informação aprovada pela gerência?', 'Um documento curto que diz como a empresa protege a informação e quem é responsável. Conta se foi aprovado e comunicado a todos.'),
  q('sec-gov', 'q-gov-responsavel', 'Está designado um responsável pela cibersegurança, com tempo e meios para o fazer?', 'A NIS2 obriga a ter alguém que responde pela cibersegurança perante a gerência e o CNCS.'),
  q('sec-gov', 'q-gov-gerencia', 'A gerência acompanha a cibersegurança pelo menos uma vez por ano?', 'Por exemplo, uma reunião onde se revêem os riscos, os incidentes e o plano de ação.'),
  q('sec-gov', 'q-gov-formacao-gerencia', 'Os membros da gerência receberam formação em cibersegurança?', 'O Decreto-Lei 125/2025 exige que a gestão tenha formação para aprovar e supervisionar as medidas de segurança.'),
  q('sec-gov', 'q-gov-formacao', 'Os colaboradores recebem formação regular sobre segurança, por exemplo a reconhecer phishing?', 'Basta uma sessão por ano ou cursos curtos online, desde que fique registado quem fez.'),
  q('sec-gov', 'q-gov-riscos', 'A empresa identifica e revê os riscos de cibersegurança de forma periódica?', 'Uma lista dos riscos mais importantes, revista pelo menos uma vez por ano, já conta.'),
  q('sec-gov', 'q-gov-funcoes', 'As responsabilidades de segurança estão definidas para cada função?', 'Por exemplo, quem aprova acessos, quem faz as cópias de segurança e quem trata os incidentes.'),
  q('sec-gov', 'q-gov-revisao', 'As medidas de segurança são revistas quando há mudanças importantes na empresa?', 'Mudanças como um sistema novo, uma nova instalação ou a troca do fornecedor de informática.'),

  q('sec-ativos', 'q-ativos-inventario', 'Existe um inventário atualizado dos equipamentos, sistemas e aplicações da empresa?', 'A lista de ativos do aLinha conta como inventário, se estiver completa.'),
  q('sec-ativos', 'q-ativos-dono', 'Cada ativo importante tem um responsável identificado?', 'A pessoa que sabe para que serve o ativo e decide sobre ele, não necessariamente quem o mantém.'),
  q('sec-ativos', 'q-ativos-criticidade', 'Os ativos estão classificados pela importância para o negócio?', 'Por exemplo, saber que o servidor de produção é mais crítico do que uma impressora.'),
  q('sec-ativos', 'q-ativos-dados', 'Sabe onde estão guardados os dados mais sensíveis, como os de clientes e colaboradores?', 'As pastas, servidores ou serviços na nuvem onde ficam esses dados.'),
  q('sec-ativos', 'q-ativos-abate', 'Os equipamentos são apagados de forma segura antes de serem abatidos ou vendidos?', 'Discos e portáteis antigos podem ainda ter dados. Formatar não chega: é preciso apagar com uma ferramenta própria ou destruir.'),
  q('sec-ativos', 'q-ativos-software', 'Só é instalado software autorizado nos computadores da empresa?', 'Por exemplo, os colaboradores não podem instalar programas sem pedir a quem gere a informática.'),

  q('sec-acessos', 'q-acessos-contas', 'Cada pessoa tem a sua própria conta, sem contas partilhadas?', 'Com contas partilhadas não se consegue saber quem fez o quê.'),
  q('sec-acessos', 'q-acessos-saidas', 'Os acessos são retirados no dia em que um colaborador sai da empresa?', 'Inclui o email, a VPN, o ERP e as outras aplicações.'),
  q('sec-acessos', 'q-acessos-minimo', 'Cada pessoa só tem acesso ao que precisa para o seu trabalho?', 'Por exemplo, quem está na produção não acede às pastas dos recursos humanos.'),
  q('sec-acessos', 'q-acessos-revisao', 'Os acessos são revistos pelo menos uma vez por ano?', 'Uma revisão simples: quem tem acesso a quê e se ainda precisa.'),
  q('sec-acessos', 'q-acessos-senhas', 'Existem regras para as senhas, como um comprimento mínimo?', 'Por exemplo, pelo menos 12 caracteres e não reutilizar senhas de outros serviços.'),
  q('sec-acessos', 'q-acessos-admin', 'As contas de administrador são usadas só para tarefas de administração?', 'Quem administra os sistemas deve usar uma conta normal no dia a dia.'),
  q('sec-acessos', 'q-mfa', 'As contas de administrador usam autenticação multifator (MFA)?', 'MFA é pedir uma segunda prova além da senha, por exemplo um código no telemóvel.'),
  q('sec-acessos', 'q-acessos-remoto', 'O acesso remoto à rede da empresa é feito de forma segura, por exemplo por VPN?', 'Inclui o acesso dos fornecedores que dão apoio à distância.'),
  q('sec-acessos', 'q-acessos-wifi', 'A rede Wi-Fi para visitantes está separada da rede da empresa?', 'Os visitantes não devem conseguir chegar aos servidores nem aos computadores da empresa.'),

  q('sec-continuidade', 'q-backups', 'As cópias de segurança dos sistemas críticos são feitas regularmente e a reposição é testada?', 'Não basta fazer cópias: é preciso experimentar repor os dados para ter a certeza de que funcionam.'),
  q('sec-continuidade', 'q-cont-copia-fora', 'Existe uma cópia de segurança guardada fora das instalações ou desligada da rede?', 'Protege contra incêndios e contra ransomware, que costuma cifrar também as cópias ligadas à rede.'),
  q('sec-continuidade', 'q-cont-plano', 'Existe um plano escrito para continuar a trabalhar se um sistema crítico falhar?', 'Diz o que fazer, por que ordem e quem decide, por exemplo se o ERP parar.'),
  q('sec-continuidade', 'q-cont-tempo', 'Sabe quanto tempo a empresa aguenta sem cada serviço crítico?', 'Por exemplo, a faturação pode parar um dia, mas a produção só algumas horas.'),
  q('sec-continuidade', 'q-cont-energia', 'Os equipamentos críticos estão protegidos contra cortes de energia?', 'Uma UPS permite desligar os servidores sem perder dados.'),
  q('sec-continuidade', 'q-cont-contactos', 'Há uma lista de contactos de emergência, como fornecedores, técnicos e seguradora?', 'Deve estar acessível mesmo sem os sistemas da empresa, por exemplo em papel.'),
  q('sec-continuidade', 'q-cont-teste', 'O plano de continuidade é testado pelo menos uma vez por ano?', 'Um exercício simples à mesa, a simular uma falha, já conta como teste.'),

  q('sec-incidentes', 'q-inc-procedimento', 'Existe um procedimento para quando acontece um incidente de segurança?', 'Quem contactar, o que fazer primeiro e como guardar provas.'),
  q('sec-incidentes', 'q-inc-reportar', 'Os colaboradores sabem a quem comunicar um email ou comportamento suspeito?', 'Uma pessoa ou endereço que todos conhecem, para reportar sem receio.'),
  q('sec-incidentes', 'q-inc-cncs', 'Sabe que os incidentes significativos têm de ser notificados ao CNCS em 24 horas?', 'A NIS2 obriga a um alerta inicial em 24 horas e a uma notificação completa em 72 horas.'),
  q('sec-incidentes', 'q-inc-registo', 'Os incidentes ficam registados, mesmo os pequenos?', 'O registo ajuda a perceber o que se repete e a melhorar.'),
  q('sec-incidentes', 'q-inc-antivirus', 'Todos os computadores e servidores têm proteção contra malware atualizada?', 'Antivírus ou EDR, com atualizações automáticas.'),
  q('sec-incidentes', 'q-inc-registos', 'Os registos (logs) dos sistemas críticos são guardados e consultados?', 'Permitem perceber o que aconteceu depois de um incidente.'),

  q('sec-fornecedores', 'q-forn-lista', 'Tem uma lista dos fornecedores com acesso aos sistemas ou aos dados da empresa?', 'Por exemplo, a empresa de informática, o fornecedor do ERP e o serviço de email.'),
  q('sec-fornecedores', 'q-forn-contratos', 'Os contratos com esses fornecedores incluem cláusulas de segurança?', 'Por exemplo, confidencialidade, aviso em caso de incidente e proteção de dados (RGPD).'),
  q('sec-fornecedores', 'q-forn-acessos', 'Os acessos dos fornecedores são controlados e retirados quando deixam de ser precisos?', 'Inclui o acesso remoto para apoio técnico.'),
  q('sec-fornecedores', 'q-forn-avaliacao', 'Avalia a segurança dos fornecedores críticos antes de os contratar?', 'Um questionário curto ou um certificado, como a ISO 27001, já ajuda.'),
  q('sec-fornecedores', 'q-forn-cloud', 'Sabe em que país ficam os dados guardados em serviços na nuvem?', 'Importa para o RGPD: os dados fora da União Europeia têm regras próprias.'),
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
      return { status: roadmap?.validated ? 'validada' : done ? 'submetida' : 'em_curso', sections, maturity: roadmap?.validated ? 2 : null }
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
