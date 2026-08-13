import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:2',
  releaseNotes: {
    en_US:
      "Pinned the buzz-relay image to a specific tested commit (ghcr.io/block/buzz:sha-4749bc7) instead of the floating :main tag, so installs get a known-working, reproducible image rather than whatever upstream's main branch happens to be at install time. No functional changes.",
    es_ES:
      'Se fijó la imagen de buzz-relay a un commit probado específico (ghcr.io/block/buzz:sha-4749bc7) en lugar de la etiqueta flotante :main, para que las instalaciones obtengan una imagen reproducible y probada, en vez de lo que sea que esté en la rama main de upstream en el momento de instalar. Sin cambios funcionales.',
    de_DE:
      'Das buzz-relay-Image wurde auf einen bestimmten, getesteten Commit festgelegt (ghcr.io/block/buzz:sha-4749bc7) statt auf den variablen :main-Tag, damit Installationen ein bekannt funktionierendes, reproduzierbares Image erhalten statt das, was zufällig gerade im Upstream-main-Branch liegt. Keine funktionalen Änderungen.',
    pl_PL:
      'Przypięto obraz buzz-relay do konkretnego przetestowanego commitu (ghcr.io/block/buzz:sha-4749bc7) zamiast zmiennego tagu :main, aby instalacje otrzymywały znany, sprawdzony i powtarzalny obraz, a nie to, co akurat znajduje się w głównej gałęzi upstream w momencie instalacji. Brak zmian funkcjonalnych.',
    fr_FR:
      "L'image buzz-relay est désormais fixée à un commit précis et testé (ghcr.io/block/buzz:sha-4749bc7) plutôt qu'à l'étiquette flottante :main, afin que les installations obtiennent une image reproductible et éprouvée plutôt que ce qui se trouve sur la branche main amont au moment de l'installation. Aucun changement fonctionnel.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
