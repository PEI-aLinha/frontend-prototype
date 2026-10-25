import type { AppNotification } from '../contracts'
import { newId, now } from './store'
import type { DemoState } from './seed'

type NewNotification = Omit<AppNotification, 'id' | 'read' | 'createdAt' | 'channels'> & { channels?: AppNotification['channels'] }

/** Appends notifications to the state (immutably). In the real API, the Notifications plugin sends them. */
export function notify(s: DemoState, ...items: NewNotification[]): DemoState {
  const created = items.map((n): AppNotification => ({ channels: ['app', 'email'], ...n, id: newId('ntf'), read: false, createdAt: now() }))
  return { ...s, notifications: [...created, ...s.notifications] }
}
