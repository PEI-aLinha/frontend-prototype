import { Outlet, ScrollRestoration } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'

export function Root() {
  return (
    <>
      <Outlet />
      <PersonaSwitcher />
      <ScrollRestoration />
    </>
  )
}
