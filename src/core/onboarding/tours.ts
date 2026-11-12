/** Guided tours (Driver.js) per screen and persona. Targets are `data-tour="…"` anchors, never styling classes. */

export interface TourStepDef {
  /** `data-tour` anchor; omit for a centred step with no highlighted element. */
  target?: string
  title: string
  intro: string
}

export type TourId =
  | 'inicio'
  | 'ativos-cliente'
  | 'ativos-consultor'
  | 'riscos-consultor'
  | 'riscos-cliente'
  | 'avaliacao'

export const TOURS: Record<TourId, TourStepDef[]> = {
  inicio: [
    { title: 'Bem-vindo ao aLinha', intro: 'Em menos de um minuto mostramos onde está cada coisa. Pode sair a qualquer momento com Esc.' },
    { target: 'home-steps', title: 'O que fazer a seguir', intro: 'A lista diz-lhe o próximo passo e marca-se sozinha à medida que avança.' },
    { target: 'home-summary', title: 'Resumo', intro: 'Ativos, riscos e a consultora que o acompanha. Clique num cartão para abrir o ecrã.' },
    { target: 'nav', title: 'Navegação', intro: 'Ativos, riscos e avaliação ficam sempre aqui à mão.' },
  ],
  'ativos-cliente': [
    { target: 'asset-add', title: 'Registe o que conhece', intro: 'Comece pelos sistemas sem os quais a empresa para: faturação, produção, email.' },
    { target: 'asset-assign', title: 'Delegue a parte técnica', intro: 'Servidores e rede ficam com o técnico. Ele recebe uma tarefa e só vê esses ativos.' },
    { target: 'asset-summary', title: 'Ponto da situação', intro: 'Quantos ativos já estão registados e quantos faltam. Ao lado, importa de Excel ou exporta a Lista de Ativos.' },
    { target: 'asset-filters', title: 'Encontre e organize', intro: 'Pesquise, filtre ou veja os ativos agrupados por serviço crítico.' },
    { target: 'asset-table', title: 'O inventário', intro: 'Clique numa linha para ver ou editar um ativo.' },
  ],
  'ativos-consultor': [
    { target: 'asset-summary', title: 'Inventário do cliente', intro: 'Foi preenchido pelo cliente e pelo técnico. É o ponto de partida da análise de riscos.' },
    { target: 'asset-table', title: 'Comece pelos críticos', intro: 'A coluna Risco mostra o nível mais alto já registado em cada ativo.' },
    { target: 'register-risk', title: 'Registar risco', intro: 'Abre o formulário já com este ativo escolhido.' },
  ],
  'riscos-consultor': [
    { target: 'risk-new', title: 'Novo risco', intro: 'Três passos, segundo a ISO/IEC 27005: identificar, avaliar e tratar. O nível é calculado pelo sistema.' },
    { target: 'risk-matrix', title: 'Matriz de risco', intro: 'Cada quadrado conta os riscos com essa probabilidade e impacto. Clique para filtrar; alterne para ver o risco depois das ações.' },
    { target: 'risk-summary', title: 'Por nível', intro: 'Os riscos altos vêm primeiro: são os que fazem subir as ações no roadmap.' },
    { target: 'risk-table', title: 'Registo', intro: 'Abra um risco para decidir o tratamento, ligar ações ou mudar o estado.' },
    { target: 'risk-template', title: 'Trabalhar em Excel', intro: 'Descarregue o template com as fórmulas do nível, ou exporte o registo completo.' },
  ],
  'riscos-cliente': [
    { title: 'Os riscos da empresa', intro: 'A consultora identificou o que pode correr mal e o que está a ser feito. Esta página é só de leitura.' },
    { target: 'risk-summary', title: 'Comece pelos altos', intro: 'O nível é calculado por regra: probabilidade × impacto.' },
    { target: 'risk-table', title: 'Em linguagem simples', intro: 'Cada linha explica o risco e as ações do roadmap que o reduzem. Abra uma para ver o detalhe.' },
  ],
  avaliacao: [
    { target: 'assessment-progress', title: 'Progresso', intro: 'Quantas perguntas já respondeu. O progresso fica guardado.' },
    { target: 'assessment-sections', title: 'Secções', intro: 'Responda por partes. As perguntas delegadas ao técnico aparecem em cada secção.' },
    { target: 'assessment-next', title: 'Depois de concluir', intro: 'A consultora valida as respostas e o roadmap. Recebe um aviso quando terminar.' },
  ],
}
