import { PlayCircle } from 'lucide-react'
import type { SnapshotId } from '../api/demo'
import { Button, Modal } from '../ui'
import type { PersonaKey } from './personas'

export interface GuideStep { text: string; as: PersonaKey; path: string; snapshot?: SnapshotId }

const ORG = '/org/componentes-agueda'
const CLIENT = '/clientes/componentes-agueda'

const SCENARIOS: Array<{ title: string; summary: string; steps: GuideStep[] }> = [
  {
    title: '1 · Inventário: o Rui delega, o Pedro regista',
    summary: 'Mostra como uma PME sem técnicos completa o inventário dividindo o trabalho.',
    steps: [
      { text: 'Rui vê o inventário incompleto e atribui o registo técnico ao Pedro.', as: 'rui', path: `${ORG}/ativos`, snapshot: 'c1' },
      { text: 'Pedro recebe a notificação, regista o PLC e responde à pergunta técnica.', as: 'pedro', path: `${ORG}/tarefas` },
      { text: 'Rui vê 7 ativos, o mapa por serviço e o progresso da avaliação.', as: 'rui', path: `${ORG}/ativos?vista=servicos` },
      { text: 'Extra: importar de Excel, ligar integrações e exportar para o CNCS.', as: 'rui', path: `${ORG}/integracoes` },
    ],
  },
  {
    title: '2 · Riscos: a Marta analisa e prioriza',
    summary: 'A consultora regista riscos e o roadmap reordena-se pelos riscos altos.',
    steps: [
      { text: 'Marta abre a carteira e entra na Componentes Águeda.', as: 'marta', path: '/carteira', snapshot: 'c2' },
      { text: 'Regista o risco de ransomware sobre o servidor e liga-o a ações.', as: 'marta', path: `${CLIENT}/ativos` },
      { text: 'Vê a matriz e o roadmap antes/depois e valida.', as: 'marta', path: `${CLIENT}/roadmap` },
    ],
  },
  {
    title: '3 · O Rui depois da validação',
    summary: 'O cliente percebe os riscos em linguagem simples, sem os poder alterar.',
    steps: [
      { text: 'Início com o cartão de riscos.', as: 'rui', path: `${ORG}/inicio`, snapshot: 'c3' },
      { text: 'Riscos em só leitura: "o que isto significa para a empresa".', as: 'rui', path: `${ORG}/riscos` },
      { text: 'A Marta vê as evidências automáticas e as revisões em atraso.', as: 'marta', path: `${CLIENT}/riscos` },
    ],
  },
]

/** Guião passo a passo da demonstração, com atalhos que mudam de persona e de dados. */
export function DemoGuide({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (s: GuideStep) => void }) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={680} title="Guião da demonstração"
      description="Três histórias de 3 a 5 minutos. Cada passo leva-o ao ecrã certo com a persona certa."
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      {SCENARIOS.map((sc) => (
        <section key={sc.title} className="flex flex-col gap-2">
          <h3 className="text-[16px] font-extrabold">{sc.title}</h3>
          <p className="text-[13px] text-ink-soft">{sc.summary}</p>
          <ol className="flex flex-col gap-1.5">
            {sc.steps.map((st) => (
              <li key={st.text} className="flex items-center gap-3 rounded-[10px] bg-paper-soft px-3 py-2">
                <span className="min-w-0 flex-1 text-[13px]">{st.text}{st.snapshot && <span className="text-muted"> (repõe os dados)</span>}</span>
                <Button size="sm" variant="ghost" icon={<PlayCircle className="size-4" aria-hidden />} onClick={() => onGo(st)}>Ir</Button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Modal>
  )
}
