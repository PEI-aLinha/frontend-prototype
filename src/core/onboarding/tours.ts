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
  | 'roadmap-cliente'
  | 'roadmap-consultor'

export const TOURS: Record<TourId, TourStepDef[]> = {
  inicio: [
    { title: 'Bem-vindo ao aLinha', intro: 'Em menos de um minuto mostramos onde está cada coisa. Pode sair a qualquer momento com Esc.' },
    { target: 'home-steps', title: 'O que fazer a seguir', intro: 'A lista diz-lhe o próximo passo e marca-se sozinha à medida que avança.' },
    { target: 'home-summary', title: 'Contexto', intro: 'Em que categoria da NIS2 a empresa fica e a consultora que o acompanha, com o contacto dela.' },
    { target: 'nav', title: 'Navegação', intro: 'Ativos, riscos e avaliação ficam sempre aqui à mão.' },
  ],
  'ativos-cliente': [
    { target: 'asset-add', title: 'Registe o que conhece', intro: 'Comece pelos sistemas sem os quais a empresa para: faturação, produção, email.' },
    { target: 'asset-assign', title: 'Delegue a parte técnica', intro: 'Servidores e rede ficam com o técnico, que recebe uma tarefa e só vê esses ativos.' },
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
    { target: 'risk-matrix', title: 'Matriz de risco', intro: 'Cada quadrado conta os riscos com essa probabilidade e impacto; o cabeçalho diz quantos há por nível. Clique para filtrar; alterne para ver o risco depois das ações. Os altos fazem subir as ações no roadmap.' },
    { target: 'risk-table', title: 'Registo', intro: 'Abra um risco para decidir o tratamento, ligar ações ou mudar o estado.' },
    { target: 'risk-template', title: 'Trabalhar em Excel', intro: 'Descarregue o template com as fórmulas do nível, ou exporte o registo completo.' },
  ],
  'riscos-cliente': [
    { title: 'Os riscos da empresa', intro: 'A consultora identificou o que pode correr mal e o que está a ser feito. Esta página é só de leitura.' },
    { target: 'risk-table', title: 'Em linguagem simples', intro: 'Cada linha explica o risco e as ações do roadmap que o reduzem. Comece pelos altos; abra uma linha para ver o detalhe.' },
    { target: 'risk-matrix', title: 'O nível é calculado', intro: 'Probabilidade × impacto, por regra. A matriz mostra onde cada risco fica.' },
  ],
  'roadmap-cliente': [
    { target: 'roadmap-summary', title: 'Onde está a empresa', intro: 'Nível de maturidade hoje e o objetivo, riscos em aberto e evidências já recolhidas.' },
    { target: 'roadmap-gaps', title: 'O que falta', intro: 'Cada lacuna da avaliação, em linguagem simples, e a ação do plano que a resolve.' },
    { target: 'roadmap-actions', title: 'O plano', intro: 'As ações por ordem de prioridade, com responsável e prazo. Os prazos também aparecem no mapa acima.' },
  ],
  'roadmap-consultor': [
    { target: 'roadmap-summary', title: 'Antes de validar', intro: 'Maturidade, riscos em aberto e evidências. Riscos sem ação aparecem também no diálogo de validação.' },
    { target: 'roadmap-actions', title: 'Ações propostas', intro: 'Proposta da IA, reordenada pelos riscos que registou. Reveja, proponha ações e valide: só então o cliente vê o plano.' },
  ],
  avaliacao: [
    { target: 'assessment-progress', title: 'Progresso', intro: 'Quantas perguntas já respondeu. O progresso fica guardado.' },
    { target: 'assessment-sections', title: 'Secções', intro: 'Responda por partes. As perguntas delegadas ao técnico aparecem em cada secção.' },
    { target: 'assessment-next', title: 'Depois de concluir', intro: 'A consultora valida as respostas e o roadmap. Recebe um aviso quando terminar.' },
  ],
}
