import { useState, type ReactNode } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { RISK_MATRIX, type Level } from '../config/riskMatrix'
import {
  AIBadge, Avatar, Button, Card, Chip, CriticalityChip, DataTable, Drawer, EmptyState, ErrorState, Eyebrow, Field, HighlightCard,
  HistoryList, Logo, Modal, Note, OptionGroup, PageHeader, PendingRow, Person, ProgressBar, RiskLevelBadge, RiskMatrix, Segmented,
  Select, SkeletonRows, StatCard, Tabs, TaskCard, TextArea, TextInput, Tooltip, useToast, type ColumnDef, type MatrixCell,
} from '../ui'

const TOKENS = [
  ['paper', '#FFFFFF'], ['paper-soft', '#F7F7F8'], ['paper-deep', '#E5E7E9'], ['ink', '#202124'], ['ink-soft', '#555A5F'], ['muted', '#646A6F'],
  ['brand', '#0B4F4A'], ['brand-deep', '#063632'], ['brand-soft', '#D2E4E1'], ['signal', '#12786E'], ['signal-soft', '#CDEDEA'], ['line', '#B8BDC1'],
  ['line-soft', '#D9DDE0'], ['risk-low', '#E3EBE9'], ['risk-medium', '#F3E7C9'], ['risk-high', '#F3DBD5'],
] as const

interface Row { name: string; type: string; crit: Level }
const ROWS: Row[] = [
  { name: 'ERP de gestão e faturação', type: 'Aplicação', crit: 'alto' },
  { name: 'Email e documentos (cloud)', type: 'Serviço cloud', crit: 'medio' },
  { name: 'Portáteis da administração (4)', type: 'Equipamento', crit: 'baixo' },
]
const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Ativo', cell: (c) => <span className="font-bold">{c.getValue() as string}</span>, meta: { width: 300 } },
  { accessorKey: 'type', header: 'Tipo', cell: (c) => <span className="text-ink-soft">{c.getValue() as string}</span>, meta: { width: 190 } },
  { id: 'owner', header: 'Responsável', cell: () => <Person initials="RS" name="Rui Santos" />, meta: { width: 210 } },
  { accessorKey: 'crit', header: 'Criticidade', cell: (c) => <CriticalityChip level={c.getValue() as Level} /> },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line-soft pt-7">
      <h2 className="text-[1.1875rem] font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

/** /_design — montra do design system. */
export function DesignPage() {
  const toast = useToast()
  const [crit, setCrit] = useState<'alto' | 'medio' | 'baixo'>('alto')
  const [opt, setOpt] = useState<string | null>('b')
  const [sel, setSel] = useState('pedro')
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [cell, setCell] = useState<MatrixCell | null>(null)
  const levelOf = (p: number, i: number): Level => { const s = p * i; return s <= 2 ? 'baixo' : s <= 4 ? 'medio' : 'alto' }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-8 py-12 max-md:px-5">
      <PageHeader eyebrow="aLinha · design system" title="Componentes" subtitle="Tokens e componentes do protótipo Riscos e Ativos, a partir de docs/design-spec.md." actions={<Logo />} />

      <Section title="Tokens de cor">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {TOKENS.map(([name, hex]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className="h-14 rounded-[10px] border border-line-soft" style={{ background: `var(--color-${name})` }} />
              <p className="text-[0.75rem] font-bold">{name}</p>
              <p className="eyebrow text-[0.625rem] text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <Eyebrow className="text-[0.75rem]">Componentes Águeda, Lda. · IBM Plex Mono 11–12</Eyebrow>
        <p className="text-[2.25rem] font-extrabold title-tight">Título de onboarding 36</p>
        <p className="text-[1.875rem] font-extrabold title-tight">Título de página 30</p>
        <p className="text-[1.625rem] font-extrabold title-tight">Título de modal 26</p>
        <p className="text-[1.125rem] font-extrabold">Título de cartão 18</p>
        <p className="text-[1rem] text-ink-soft">Subtítulo de página 16 · ink-soft</p>
        <p className="text-[0.9375rem]">Corpo 15 — linguagem simples para quem não é técnico nem jurista.</p>
        <p className="text-[0.8125rem] text-muted">Texto secundário 13 · muted</p>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Continuar</Button>
          <Button variant="secondary">Continuar</Button>
          <Button icon={<Plus className="size-4" aria-hidden />}>Adicionar ativo</Button>
          <Button loading>A guardar</Button>
          <Button disabled>Indisponível</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="danger" size="sm">Remover</Button>
          <Button size="sm" variant="secondary">Pequeno</Button>
        </div>
      </Section>

      <Section title="Field · Select · Segmented · Option">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Nome" hint="Como a equipa conhece o ativo.">{(p) => <TextInput id={p.id} aria-describedby={p.describedBy} defaultValue="PLC das linhas de montagem" />}</Field>
          <Field label="Localização" optional error="Indique onde fica o ativo.">{(p) => <TextInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} />}</Field>
          <Field label="Analista">{(p) => <Select id={p.id} value={sel} onChange={setSel} options={[{ value: 'pedro', label: 'Pedro Almeida' }, { value: 'outro', label: 'Convidar outro analista', hint: 'Fora deste protótipo' }]} />}</Field>
          <Field label="Descrição">{(p) => <TextArea id={p.id} defaultValue="Backups diários para o NAS às 23h." />}</Field>
          <div className="flex flex-col gap-2">
            <p className="text-[0.8125rem] font-semibold text-ink-soft">Criticidade</p>
            <Segmented ariaLabel="Criticidade" value={crit} onChange={setCrit} options={[{ value: 'alto', label: 'Alta' }, { value: 'medio', label: 'Média' }, { value: 'baixo', label: 'Baixa' }]} />
          </div>
          <OptionGroup name="demo" legend="Opção (radio)" value={opt} onChange={setOpt} options={[{ value: 'a', label: 'Sim, e a reposição é testada periodicamente' }, { value: 'b', label: 'Sim, mas a reposição nunca foi testada' }]} />
        </div>
      </Section>

      <Section title="Chip · nível de risco · IA">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip>Etiqueta</Chip><Chip tone="neutral">Etiqueta</Chip><Chip tone="dark">Alta</Chip>
          <CriticalityChip level="alto" /><CriticalityChip level="medio" /><CriticalityChip level="baixo" />
          <RiskLevelBadge level="alto" /><RiskLevelBadge level="medio" /><RiskLevelBadge level="baixo" />
          <RiskLevelBadge level="alto" size="lg" prefix="Risco " />
          <AIBadge /><AIBadge kind="info" />
          <Tooltip content="Os níveis têm sempre texto e ícone, não só cor."><Button variant="secondary" size="sm">Tooltip</Button></Tooltip>
        </div>
      </Section>

      <Section title="Card · StatCard · HighlightCard · Note">
        <Note>Este inventário é a base da análise de riscos e da Lista de Ativos que a empresa tem de comunicar ao CNCS.</Note>
        <div className="flex gap-4 max-md:flex-col">
          <StatCard label="Serviços críticos" value="2" caption="Produção de componentes · Faturação e expedição" />
          <StatCard label="Ativos registados" value="3" caption="Registados por si" />
          <StatCard label="Por registar" value="—" caption="Servidores, rede e sistemas de produção" onClick={() => toast.show('Cartão clicável')} />
        </div>
        <HighlightCard eyebrow="Avaliação de maturidade · NIS2 + RGPD" title="8 de 18 perguntas respondidas" action={<Button variant="inverse">Continuar avaliação →</Button>}>
          <ProgressBar value={8} max={18} label="Progresso" track="dark" className="mb-3 max-w-[420px]" />
          1 pergunta atribuída a Pedro Almeida · guardado às 17:44
        </HighlightCard>
        <Card><Eyebrow>Cartão</Eyebrow><p className="mt-1.5 font-bold">Conteúdo do cartão</p></Card>
      </Section>

      <Section title="Table · PendingRow · Avatar">
        <DataTable caption="Exemplo" data={ROWS} columns={COLUMNS} getRowId={(r) => r.name} renderCard={(r) => <p className="font-bold">{r.name}</p>}
          footer={<PendingRow title="Servidores, rede e sistemas de produção" text="Ainda não registados. O Pedro conhece estes sistemas: atribua-lhe o registo." action={<Button variant="secondary">Atribuir ao Pedro</Button>} />} />
        <div className="flex items-center gap-3"><Avatar initials="RS" size={24} /><Avatar initials="PA" size={36} /><Avatar initials="MF" size={44} /><Avatar initials="IA" size={40} tone="dark" /></div>
      </Section>

      <Section title="Modal · Drawer · Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>Abrir modal</Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>Abrir painel lateral</Button>
          <Button variant="secondary" onClick={() => toast.show('Tarefa enviada ao Pedro Almeida')}>Mostrar toast</Button>
          <Button variant="secondary" onClick={() => toast.show('Não foi possível guardar', 'error')}>Toast de erro</Button>
        </div>
        <Modal open={modal} onOpenChange={setModal} chip={<Chip>Tarefa para analista</Chip>} title="Atribuir registo de ativos" description="O analista recebe a tarefa por email e na sua lista." footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={() => setModal(false)}>Atribuir</Button></>} />
        <Drawer open={drawer} onOpenChange={setDrawer} eyebrow="Ativo" title="Servidor de produção" chip={<CriticalityChip level="alto" />} footer={<Button onClick={() => setDrawer(false)}>Guardar</Button>}>
          <p className="text-[0.875rem] text-ink-soft">Conteúdo do painel.</p>
        </Drawer>
      </Section>

      <Section title="EmptyState · Skeleton · Erro">
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState icon={<Boxes className="size-5" aria-hidden />} title="Ainda não há ativos">Comece pelos sistemas sem os quais a empresa para.</EmptyState>
          <Card><SkeletonRows rows={3} /></Card>
          <ErrorState error={new Error('Não foi possível ligar ao servidor.')} onRetry={() => toast.show('A tentar de novo')} />
        </div>
      </Section>

      <Section title="TaskCard · Tabs · Histórico">
        <TaskCard type="Ativos" due="Até qui., 15 out." title="Registar servidores, rede e sistemas de produção" meta="Inventário de ativos · 0 de 4 registados" action={<Button>Registar</Button>} />
        <TaskCard type="Pergunta técnica" title="As cópias de segurança dos sistemas críticos são feitas regularmente?" meta="Avaliação de maturidade · Continuidade do negócio" done />
        <Tabs tabs={[
          { value: 'h', label: 'Histórico', count: 2, content: <HistoryList items={[{ id: '1', who: { name: 'Pedro Almeida', initials: 'PA' }, actorType: 'user', summary: 'Registou o ativo "PLC das linhas de montagem"', createdAt: '2026-10-15T09:41:00' }, { id: '2', who: null, actorType: 'ai', summary: 'Propôs o roadmap a partir das lacunas', createdAt: '2026-10-14T10:20:00' }]} /> },
          { value: 'r', label: 'Riscos', content: <p className="text-[0.875rem] text-ink-soft">Sem riscos.</p> },
        ]} />
      </Section>

      <Section title="Matriz de risco">
        <div className="max-w-[520px]">
          <RiskMatrix probability={RISK_MATRIX.probability} impact={RISK_MATRIX.impact} levelOf={levelOf} count={(p, i) => (p === 2 && i === 3 ? 1 : p === 2 && i === 2 ? 2 : 0)} selected={cell} onSelect={setCell} />
        </div>
      </Section>

      <Section title="Painel de ajuda da IA">
        <div className="flex max-w-[360px] flex-col gap-3.5 rounded-[18px] bg-brand-deep p-[26px]">
          <Eyebrow className="text-[0.75rem] text-signal-soft">Ajuda da IA</Eyebrow>
          <p className="text-[1.1875rem] font-extrabold text-white">O que significa esta pergunta?</p>
          <p className="text-[0.875rem] text-brand-soft">Uma cópia de segurança é uma cópia dos dados guardada noutro sítio.</p>
          <div className="rounded-[12px] bg-brand px-4 py-3.5"><p className="text-[0.8125rem] font-bold text-white">Exemplo</p><p className="text-[0.8125rem] text-brand-soft">Uma vez por mês, o técnico repõe uma pasta.</p></div>
          <div><AIBadge kind="info" onDark /></div>
        </div>
      </Section>
    </div>
  )
}
