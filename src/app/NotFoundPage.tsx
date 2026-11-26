import { Logo, NotFoundState } from '../ui'

/** Any address the app does not know: say so and offer the way home, instead of silently redirecting. */
export function NotFoundPage() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-8 px-6">
      <Logo />
      <NotFoundState headingLevel={1}>Este endereço não existe no aLinha. Verifique se está completo, ou volte ao início.</NotFoundState>
    </main>
  )
}
