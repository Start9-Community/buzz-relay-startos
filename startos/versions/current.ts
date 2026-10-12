import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:2',
  releaseNotes: {
    en_US:
      'Restarting Buzz Relay while it is still starting stops every process of the previous run.',
    es_ES:
      'Reiniciar Buzz Relay mientras aún se está iniciando detiene todos los procesos de la ejecución anterior.',
    de_DE:
      'Ein Neustart von Buzz Relay, während es noch startet, beendet alle Prozesse des vorherigen Laufs.',
    pl_PL:
      'Ponowne uruchomienie Buzz Relay w trakcie uruchamiania zatrzymuje wszystkie procesy poprzedniego uruchomienia.',
    fr_FR:
      "Redémarrer Buzz Relay pendant son démarrage arrête tous les processus de l'exécution précédente.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
