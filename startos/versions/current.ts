import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:1',
  releaseNotes: {
    en_US: `Initial release for StartOS. Runs a closed, single-owner Buzz relay with PostgreSQL, Redis, and object storage bundled as private sidecars, plus the mobile pairing sidecar for QR device pairing. Members are managed from the Actions tab.

- The Role field in Manage Members describes what each role can do.
- The key field in Set Relay Owner explains that the owner is always a member and cannot be removed.`,
    es_ES: `Lanzamiento inicial para StartOS. Ejecuta un relay Buzz cerrado y de un solo propietario, con PostgreSQL, Redis y almacenamiento de objetos incluidos como sidecars privados, además del sidecar de emparejamiento móvil para vincular dispositivos por código QR. Los miembros se gestionan desde la pestaña Acciones.

- El campo Rol de Gestionar miembros describe lo que puede hacer cada rol.
- El campo de clave de Establecer propietario del relay explica que el propietario es siempre miembro y no se le puede eliminar.`,
    de_DE: `Erstveröffentlichung für StartOS. Betreibt ein geschlossenes Buzz-Relay mit einem einzigen Besitzer, inklusive PostgreSQL, Redis und Objektspeicher als private Sidecars sowie dem Sidecar für die mobile Kopplung per QR-Code. Mitglieder werden im Reiter „Aktionen“ verwaltet.

- Das Feld „Rolle“ in „Mitglieder verwalten“ beschreibt, was jede Rolle darf.
- Das Schlüsselfeld in „Relay-Eigentümer festlegen“ erklärt, dass der Eigentümer immer Mitglied ist und nicht entfernt werden kann.`,
    pl_PL: `Pierwsze wydanie dla StartOS. Uruchamia zamknięty przekaźnik Buzz z jednym właścicielem, wraz z PostgreSQL, Redis i magazynem obiektów jako prywatnymi kontenerami pomocniczymi oraz kontenerem parowania mobilnego do wiązania urządzeń kodem QR. Członkami zarządza się na karcie Akcje.

- Pole „Rola” w „Zarządzaj członkami” opisuje, co może każda rola.
- Pole klucza w „Ustaw właściciela relay” wyjaśnia, że właściciel jest zawsze członkiem i nie można go usunąć.`,
    fr_FR: `Version initiale pour StartOS. Exécute un relais Buzz fermé à propriétaire unique, avec PostgreSQL, Redis et le stockage d'objets inclus comme services auxiliaires privés, ainsi que le service d'appairage mobile pour lier un appareil par code QR. Les membres se gèrent depuis l'onglet Actions.

- Le champ Rôle de Gérer les membres décrit ce que chaque rôle permet de faire.
- Le champ de clé de Définir le propriétaire du relais explique que le propriétaire est toujours membre et ne peut pas être retiré.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
