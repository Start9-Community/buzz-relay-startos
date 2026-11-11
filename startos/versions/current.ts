import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:4',
  releaseNotes: {
    en_US:
      'Improves service reliability and health-check responsiveness. Requires StartOS 0.4.2 or newer.',
    es_ES:
      'Mejora la fiabilidad del servicio y la respuesta de las comprobaciones de estado. Requiere StartOS 0.4.2 o posterior.',
    de_DE:
      'Verbessert die Zuverlässigkeit des Dienstes und die Reaktionszeit der Zustandsprüfungen. Erfordert StartOS 0.4.2 oder neuer.',
    pl_PL:
      'Poprawia niezawodność usługi i szybkość sprawdzania stanu. Wymaga StartOS 0.4.2 lub nowszego.',
    fr_FR:
      'Améliore la fiabilité du service et la réactivité des contrôles de santé. Nécessite StartOS 0.4.2 ou une version ultérieure.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
