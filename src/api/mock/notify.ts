import type { AppNotification } from '../contracts'
import { newId, now } from './store'
import type { DemoState } from './seed'

type NewNotification = Omit<AppNotification, 'id' | 'read' | 'createdAt' | 'channels'> & { channels?: AppNotification['channels'] }

/** Acrescenta notificações ao estado (imutável). Na API real, é o plugin Notifications que as envia. */
export function notify(s: DemoState, ...items: NewNotification[]): DemoState {
  const created = items.map((n): AppNotification => ({ channels: ['app', 'email'], ...n, id: newId('ntf'), read: false, createdAt: now() }))
  return { ...s, notifications: [...created, ...s.notifications] }
}
