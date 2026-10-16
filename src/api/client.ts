import type { Api, DemoActor } from './contracts'
import { createMockApi } from './mock/mockApi'

// Ponto único de troca: para ligar à API real, criar createHttpApi() com os mesmos contratos.
let currentActor: DemoActor = { userId: 'u-rui' }

export function setActor(actor: DemoActor): void {
  currentActor = actor
}

export const api: Api = createMockApi(() => currentActor)
