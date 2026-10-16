import { createBrowserRouter } from 'react-router'
import { HomeRedirect } from './HomeRedirect'
import { DesignPage } from './DesignPage'
import { ClientLayout, ConsultantLayout } from './layouts'
import { OutOfScope } from './OutOfScope'
import { Root } from './Root'

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '_design', element: <DesignPage /> },
      {
        path: 'org/:org',
        element: <ClientLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'avaliacao', element: <OutOfScope eyebrow="Componentes Águeda, Lda." title="Avaliação" /> },
          { path: 'equipa', element: <OutOfScope eyebrow="Componentes Águeda, Lda." title="Equipa" /> },
        ],
      },
      {
        path: 'carteira',
        element: <ConsultantLayout />,
        children: [],
      },
      {
        path: 'clientes/:org',
        element: <ConsultantLayout />,
        children: [],
      },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
])
