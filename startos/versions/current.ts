import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:0',
  releaseNotes: {
    en_US:
      'Initial release for StartOS. Runs a closed, single-owner Buzz relay with PostgreSQL, Redis, and object storage bundled as private sidecars, plus the mobile pairing sidecar for QR device pairing. Members are managed from the Actions tab.',
    es_ES:
      'Lanzamiento inicial para StartOS. Ejecuta un relay Buzz cerrado y de un solo propietario, con PostgreSQL, Redis y almacenamiento de objetos incluidos como sidecars privados, además del sidecar de emparejamiento móvil para vincular dispositivos por código QR. Los miembros se gestionan desde la pestaña Acciones.',
    de_DE:
      'Erstveröffentlichung für StartOS. Betreibt ein geschlossenes Buzz-Relay mit einem einzigen Besitzer, inklusive PostgreSQL, Redis und Objektspeicher als private Sidecars sowie dem Sidecar für die mobile Kopplung per QR-Code. Mitglieder werden im Reiter „Aktionen“ verwaltet.',
    pl_PL:
      'Pierwsze wydanie dla StartOS. Uruchamia zamknięty przekaźnik Buzz z jednym właścicielem, wraz z PostgreSQL, Redis i magazynem obiektów jako prywatnymi kontenerami pomocniczymi oraz kontenerem parowania mobilnego do wiązania urządzeń kodem QR. Członkami zarządza się na karcie Akcje.',
    fr_FR:
      "Version initiale pour StartOS. Exécute un relais Buzz fermé à propriétaire unique, avec PostgreSQL, Redis et le stockage d'objets inclus comme services auxiliaires privés, ainsi que le service d'appairage mobile pour lier un appareil par code QR. Les membres se gèrent depuis l'onglet Actions.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
