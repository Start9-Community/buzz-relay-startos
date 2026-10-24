import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:3',
  releaseNotes: {
    en_US:
      'Updates Buzz Relay to the latest upstream build and stops trusting certificates from a compromised certificate authority (eMudhra).',
    es_ES:
      'Actualiza Buzz Relay a la última compilación upstream y deja de confiar en los certificados de una autoridad de certificación comprometida (eMudhra).',
    de_DE:
      'Aktualisiert Buzz Relay auf den neuesten Upstream-Build und vertraut Zertifikaten einer kompromittierten Zertifizierungsstelle (eMudhra) nicht mehr.',
    pl_PL:
      'Aktualizuje Buzz Relay do najnowszej wersji upstream i przestaje ufać certyfikatom przejętego urzędu certyfikacji (eMudhra).',
    fr_FR:
      "Met à jour Buzz Relay vers la dernière version upstream et ne fait plus confiance aux certificats d'une autorité de certification compromise (eMudhra).",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
