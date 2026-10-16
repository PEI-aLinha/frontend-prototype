import { ApiError, type AuditEntry, type Id } from '../contracts'
import { buildSnapshot, STATE_VERSION, type DemoState, type SnapshotId } from './seed'

const STORAGE_KEY = 'alinha-demo-state'
const FAIL_KEY = 'alinha-demo-fail'
const MIN_LATENCY = 200
const MAX_LATENCY = 600

let state: DemoState = load()
const listeners = new Set<() => void>()

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === STATE_VERSION) return parsed
    }
  } catch {
    // localStorage unavailable or corrupted data: start over with the demo data.
  }
  return buildSnapshot('c1')
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // No persistence (private mode): the prototype keeps working in memory.
  }
}

export function getState(): Readonly<DemoState> {
  return state
}

/** Replaces the state immutably and saves it. */
export function setState(update: (s: DemoState) => DemoState): void {
  state = update(state)
  persist()
  listeners.forEach((l) => l())
}

export function resetDemo(snapshot: SnapshotId = 'c1'): void {
  state = buildSnapshot(snapshot)
  persist()
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isFailureMode(): boolean {
  try {
    return localStorage.getItem(FAIL_KEY) === '1'
  } catch {
    return false
  }
}

export function setFailureMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(FAIL_KEY, '1')
    else localStorage.removeItem(FAIL_KEY)
  } catch {
    // ignored: without localStorage there is no failure mode.
  }
}

/** Simulated latency (200–600 ms). In tests (navigator.webdriver) uses the minimum. */
export async function simulate<T>(work: () => T): Promise<T> {
  const fast = typeof navigator !== 'undefined' && navigator.webdriver
  const delay = fast ? 120 : MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY)
  await new Promise((r) => setTimeout(r, delay))
  if (isFailureMode()) throw new ApiError('Não foi possível ligar ao servidor. Tente de novo dentro de momentos.', 503)
  return work()
}

let seq = 0
export function newId(prefix: string): Id {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq}`
}

export function now(): string {
  return new Date().toISOString()
}

export function auditEntry(entry: Omit<AuditEntry, 'id' | 'createdAt' | 'actorType'> & { actorType?: AuditEntry['actorType'] }): AuditEntry {
  return { actorType: 'user', ...entry, id: newId('aud'), createdAt: now() }
}
