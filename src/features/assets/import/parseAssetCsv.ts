import { ALL_SERVICES, type AssetInput, type AssetType, type CriticalService, type Level, type User } from '../../../api/contracts'
import { ASSET_TYPE_LABEL } from '../../../config/labels'

export interface ParsedRow {
  line: number
  name: string
  input: AssetInput | null
  errors: string[]
  warnings: string[]
}

export const CSV_TEMPLATE = [
  'Ativo;Tipo;Serviço crítico;Localização;Responsável;Criticidade',
  'Impressoras do escritório;Equipamento;;Escritório;Rui Santos;Baixa',
  'Software de desenho técnico (CAD);Aplicação;Produção de componentes;Gabinete técnico;Rui Santos;Média',
].join('\r\n')

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

interface RawRow { name: string; type: string; service: string; location: string; owner: string; criticality: string }

const HEADERS: Record<string, keyof RawRow> = {
  ativo: 'name', nome: 'name', tipo: 'type', 'servico critico': 'service', servico: 'service', localizacao: 'location', local: 'location',
  responsavel: 'owner', criticidade: 'criticality',
}

const CRITICALITY: Record<string, Level> = { alta: 'alto', alto: 'alto', media: 'medio', medio: 'medio', baixa: 'baixo', baixo: 'baixo' }

/** Divide uma linha CSV respeitando aspas ("a;b" fica num só campo). */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === sep) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

function typeFrom(label: string): AssetType | null {
  const n = norm(label)
  const hit = (Object.entries(ASSET_TYPE_LABEL) as Array<[AssetType, string]>).find(([key, l]) => norm(l) === n || key === n.replace(/\s+/g, '_'))
  if (hit) return hit[0]
  if (n.includes('cloud')) return 'servico_cloud'
  if (/\bot\b|plc|producao/.test(n)) return 'sistema_producao_ot'
  return null
}

/** Lê o CSV da Lista de Ativos e valida cada linha. Nunca grava nada: só prepara a pré-visualização. */
export function parseAssetCsv(text: string, ctx: { services: CriticalService[]; users: User[]; existingNames: string[] }): { rows: ParsedRow[]; error: string | null } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], error: 'O ficheiro tem de ter uma linha de cabeçalho e pelo menos um ativo.' }
  const sep = lines[0].includes(';') ? ';' : ','
  const header = splitCsvLine(lines[0], sep).map((h) => HEADERS[norm(h)])
  if (!header.includes('name')) return { rows: [], error: 'Não encontrámos a coluna "Ativo" (ou "Nome") no cabeçalho.' }

  const seen = new Set(ctx.existingNames.map(norm))
  const rows = lines.slice(1).map((line, i): ParsedRow => {
    const cells = splitCsvLine(line, sep)
    const raw: RawRow = { name: '', type: '', service: '', location: '', owner: '', criticality: '' }
    header.forEach((k, j) => { if (k) raw[k] = cells[j] ?? '' })
    const errors: string[] = []
    const warnings: string[] = []

    if (raw.name.length < 2) errors.push('Falta o nome do ativo.')
    else if (seen.has(norm(raw.name))) warnings.push('Já existe um ativo com este nome; será criado outro.')
    if (raw.name) seen.add(norm(raw.name))

    const type = raw.type ? typeFrom(raw.type) : null
    if (!raw.type) errors.push('Falta o tipo.')
    else if (!type) errors.push(`Tipo desconhecido: "${raw.type}".`)

    const criticality = CRITICALITY[norm(raw.criticality)] ?? null
    if (!criticality) errors.push(raw.criticality ? `Criticidade desconhecida: "${raw.criticality}" (use Alta, Média ou Baixa).` : 'Falta a criticidade.')

    let criticalServiceId: AssetInput['criticalServiceId'] = null
    if (raw.service) {
      if (['todos', 'todos os servicos'].includes(norm(raw.service))) criticalServiceId = ALL_SERVICES
      else {
        const svc = ctx.services.find((x) => norm(x.name) === norm(raw.service))
        if (svc) criticalServiceId = svc.id
        else warnings.push(`Serviço "${raw.service}" não existe; fica sem serviço.`)
      }
    }

    let ownerId: string | null = null
    if (raw.owner) {
      const u = ctx.users.find((x) => norm(x.name) === norm(raw.owner))
      if (u) ownerId = u.id
      else warnings.push(`Responsável "${raw.owner}" não está na equipa; fica por atribuir.`)
    }

    const input: AssetInput | null = errors.length ? null : { name: raw.name, type: type!, criticality: criticality!, criticalServiceId, ownerId, location: raw.location || undefined, source: 'importacao' }
    return { line: i + 2, name: raw.name || '(sem nome)', input, errors, warnings }
  })
  return { rows, error: null }
}
