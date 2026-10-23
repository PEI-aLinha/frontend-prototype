import { Outlet, ScrollRestoration } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'
import { RouteAnnouncer } from './RouteAnnouncer'

export function Root() {
  return (
    <>
      <Outlet />
      <PersonaSwitcher />
      <ScrollRestoration />
      <RouteAnnouncer />
    </>
  )
}
