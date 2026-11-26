import { Fragment, type ReactNode } from 'react'
import { INLINE_TERMS } from '../config/glossary'
import { Term } from './Term'

/**
 * Running text with its abbreviations explained: the first occurrence of each known term (MFA, MyCiber, OT…)
 * becomes a glossary Term; the rest of the text is left as is.
 */
export function GlossaryText({ children }: { children: string }) {
  const out: ReactNode[] = []
  let rest = children
  const used = new Set<string>()
  for (;;) {
    let first: { index: number; length: number; key: (typeof INLINE_TERMS)[number][1] } | null = null
    for (const [re, key] of INLINE_TERMS) {
      if (used.has(key)) continue
      const m = re.exec(rest)
      if (m && (!first || m.index < first.index)) first = { index: m.index, length: m[0].length, key }
    }
    if (!first) break
    used.add(first.key)
    if (first.index > 0) out.push(rest.slice(0, first.index))
    out.push(<Term key={first.key} k={first.key}>{rest.slice(first.index, first.index + first.length)}</Term>)
    rest = rest.slice(first.index + first.length)
  }
  if (rest) out.push(rest)
  return <>{out.map((part, i) => <Fragment key={i}>{part}</Fragment>)}</>
}
