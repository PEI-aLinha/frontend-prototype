// Sectors and subsectors from Annexes I and II of the Regime Jurídico da Cibersegurança (DL 125/2025, NIS2).
// `annex` feeds the NIS2 framing suggestion (US11); `null` means the sector is not covered.

export interface Sector {
  id: string
  label: string
  annex: 1 | 2 | null
  subsectors: Array<{ id: string; label: string }>
}

export const SECTORS: Sector[] = [
  { id: 'energia', label: 'Energia', annex: 1, subsectors: [
    { id: 'eletricidade', label: 'Eletricidade' },
    { id: 'aquecimento', label: 'Aquecimento e arrefecimento urbano' },
    { id: 'petroleo', label: 'Petróleo' },
    { id: 'gas', label: 'Gás' },
    { id: 'hidrogenio', label: 'Hidrogénio' },
  ] },
  { id: 'transportes', label: 'Transportes', annex: 1, subsectors: [
    { id: 'aereo', label: 'Transporte aéreo' },
    { id: 'ferroviario', label: 'Transporte ferroviário' },
    { id: 'maritimo', label: 'Transporte marítimo e fluvial' },
    { id: 'rodoviario', label: 'Transporte rodoviário' },
  ] },
  { id: 'bancario', label: 'Setor bancário', annex: 1, subsectors: [] },
  { id: 'financeiro', label: 'Infraestruturas do mercado financeiro', annex: 1, subsectors: [] },
  { id: 'saude', label: 'Saúde', annex: 1, subsectors: [] },
  { id: 'agua', label: 'Água potável', annex: 1, subsectors: [] },
  { id: 'aguas_residuais', label: 'Águas residuais', annex: 1, subsectors: [] },
  { id: 'infra_digitais', label: 'Infraestruturas digitais', annex: 1, subsectors: [] },
  { id: 'tic', label: 'Gestão de serviços de TIC (entre empresas)', annex: 1, subsectors: [] },
  { id: 'espaco', label: 'Espaço', annex: 1, subsectors: [] },
  { id: 'postais', label: 'Serviços postais e de estafeta', annex: 2, subsectors: [] },
  { id: 'residuos', label: 'Gestão de resíduos', annex: 2, subsectors: [] },
  { id: 'quimicos', label: 'Produção, fabrico e distribuição de produtos químicos', annex: 2, subsectors: [] },
  { id: 'alimentar', label: 'Produção, transformação e distribuição de produtos alimentares', annex: 2, subsectors: [] },
  { id: 'industria', label: 'Indústria transformadora', annex: 2, subsectors: [
    { id: 'dispositivos_medicos', label: 'Fabrico de dispositivos médicos' },
    { id: 'informatica', label: 'Fabrico de equipamentos informáticos, eletrónicos e óticos' },
    { id: 'eletrico', label: 'Fabrico de equipamento elétrico' },
    { id: 'maquinas', label: 'Fabrico de máquinas e equipamentos' },
    { id: 'automoveis', label: 'Fabrico de veículos automóveis, reboques e componentes' },
    { id: 'outro_transporte', label: 'Fabrico de outro equipamento de transporte' },
  ] },
  { id: 'digitais', label: 'Prestadores de serviços digitais', annex: 2, subsectors: [] },
  { id: 'investigacao', label: 'Investigação', annex: 2, subsectors: [] },
  { id: 'outro', label: 'Outro setor (não está nesta lista)', annex: null, subsectors: [] },
]

export const sectorById = (id: string) => SECTORS.find((s) => s.id === id)
