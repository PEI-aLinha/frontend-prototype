import type { Api, DemoActor } from './contracts'
import { createMockApi } from './mock/mockApi'

// Single swap point: to connect to the real API, create createHttpApi() with the same contracts.
let currentActor: DemoActor = { userId: 'u-rui' }

export function setActor(actor: DemoActor): void {
  currentActor = actor
}

export const api: Api = createMockApi(() => currentActor)
