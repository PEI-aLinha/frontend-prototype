import { Particles, ParticlesProvider } from '@tsparticles/react'
import type { Engine, ISourceOptions } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import { useMemo } from 'react'
import { useAppearance } from '../../../core/appearance'

const initEngine = (engine: Engine) => loadSlim(engine)

// Slow drifting network of points and lines in the on-brand colour (white in light, dark ink in dark).
const buildOptions = (color: string): ISourceOptions => ({
  fullScreen: { enable: false },
  background: { color: 'transparent' },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 55 },
    color: { value: color },
    opacity: { value: 0.4 },
    size: { value: { min: 1.5, max: 2.5 } },
    links: { enable: true, color, opacity: 0.16, distance: 150, width: 1 },
    move: { enable: true, speed: 0.35, outModes: { default: 'bounce' } },
  },
  interactivity: {
    events: { onHover: { enable: true, mode: 'grab' } },
    modes: { grab: { distance: 160, links: { opacity: 0.35 } } },
  },
})

/** On-brand colour per theme; keep in sync with --color-white in src/index.css. */
const ON_BRAND = { light: '#ffffff', dark: '#0d1716' } as const

/** Animated background of the onboarding panel (loaded lazily, only on the registration screens). */
export default function OnboardingParticles() {
  const { resolvedTheme } = useAppearance()
  const options = useMemo(() => buildOptions(ON_BRAND[resolvedTheme]), [resolvedTheme])
  return (
    <ParticlesProvider init={initEngine}>
      <Particles id="onboarding-particles" key={resolvedTheme} options={options} className="absolute inset-0" />
    </ParticlesProvider>
  )
}
