// Glossário em linguagem simples. Cada termo técnico da interface aponta para uma entrada daqui.
export interface GlossaryEntry {
  term: string
  short: string
  example?: string
}

export const GLOSSARY = {
  ativo: {
    term: 'Ativo',
    short: 'Tudo aquilo de que a empresa depende para trabalhar e que pode falhar ou ser atacado: servidores, programas, equipamentos, serviços na cloud.',
    example: 'O ERP de faturação, o servidor de produção, os portáteis da administração.',
  },
  servicoCritico: {
    term: 'Serviço crítico',
    short: 'Uma atividade da empresa que, se parar, causa prejuízo sério. Cada ativo indica que serviço ajuda a manter.',
    example: 'Produção de componentes; Faturação e expedição.',
  },
  criticidade: {
    term: 'Criticidade',
    short: 'Quão grave seria perder este ativo. Alta: a produção ou a faturação param. Média: atrasa o trabalho. Baixa: incómodo.',
  },
  listaAtivos: {
    term: 'Lista de Ativos (CNCS)',
    short: 'Lista que as entidades abrangidas pela NIS2 têm de comunicar ao CNCS (Regulamento n.º 756/2026). O aLinha prepara-a a partir do inventário; a submissão é feita fora da plataforma.',
  },
  risco: {
    term: 'Risco',
    short: 'Algo que pode correr mal (uma ameaça) a um ativo, avaliado pela probabilidade de acontecer e pelo impacto se acontecer.',
    example: 'Um ransomware cifrar o servidor de produção.',
  },
  ameaca: {
    term: 'Ameaça',
    short: 'O acontecimento que causa o problema: um ataque, uma avaria, um erro humano.',
  },
  probabilidade: {
    term: 'Probabilidade',
    short: 'Quão provável é a ameaça acontecer nos próximos tempos. Baixa, média ou alta.',
  },
  impacto: {
    term: 'Impacto',
    short: 'O estrago se acontecer: tempo parado, dinheiro, dados pessoais expostos, multas.',
  },
  nivelRisco: {
    term: 'Nível de risco',
    short: 'Calculado automaticamente: probabilidade × impacto. Ninguém o escolhe à mão e a IA não o decide. Com a escala 1–3: 1–2 baixo, 3–4 médio, 6–9 alto.',
  },
  tratamento: {
    term: 'Tratamento do risco',
    short: 'A decisão sobre o que fazer com o risco (ISO/IEC 27005): mitigar, aceitar, evitar ou partilhar.',
  },
  riscoResidual: {
    term: 'Risco residual',
    short: 'O risco que sobra depois de aplicar as ações. Serve para mostrar o efeito esperado do tratamento.',
  },
  matriz: {
    term: 'Matriz de risco',
    short: 'Uma grelha com a probabilidade nas linhas e o impacto nas colunas. Cada quadrado mostra quantos riscos há com essa combinação; quanto mais acima e à direita, mais grave.',
  },
  roadmap: {
    term: 'Roadmap',
    short: 'O plano de ação da empresa: a lista ordenada das medidas para fechar as lacunas da avaliação, com prazo, responsável e prova de cumprimento.',
  },
  iso27005: {
    term: 'ISO/IEC 27005',
    short: 'Norma internacional que explica como identificar, avaliar e tratar riscos de segurança da informação. O aLinha segue o seu método de forma simplificada.',
  },
  evidencia: {
    term: 'Evidência',
    short: 'A prova de que uma medida está em prática: um documento, uma captura de configuração ou um dado recolhido automaticamente.',
  },
  integracao: {
    term: 'Integração',
    short: 'Uma ligação só de leitura a um sistema da empresa (ex.: Microsoft 365). Sugere ativos e recolhe evidências; nunca altera nada nesse sistema.',
  },
  nis2: {
    term: 'NIS2',
    short: 'Diretiva europeia de cibersegurança, aplicada em Portugal pelo Regime Jurídico da Cibersegurança. Obriga a gerir riscos, registar ativos e notificar incidentes.',
  },
} satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY
