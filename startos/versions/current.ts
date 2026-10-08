import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:1',
  releaseNotes: {
    en_US: `- The Role field in Manage Members describes what each role can do.
- The key field in Set Relay Owner explains that the owner is always a member and cannot be removed.
- Media and git storage runs on Silo, a MinIO-compatible server. Existing media and git objects carry over.`,
    es_ES: `- El campo Rol de Gestionar miembros describe lo que puede hacer cada rol.
- El campo de clave de Establecer propietario del relay explica que el propietario es siempre miembro y no se le puede eliminar.
- El almacenamiento de medios y git funciona con Silo, un servidor compatible con MinIO. Los medios y objetos git existentes se conservan.`,
    de_DE: `- Das Feld „Rolle“ in „Mitglieder verwalten“ beschreibt, was jede Rolle darf.
- Das Schlüsselfeld in „Relay-Eigentümer festlegen“ erklärt, dass der Eigentümer immer Mitglied ist und nicht entfernt werden kann.
- Medien- und Git-Speicher laufen auf Silo, einem MinIO-kompatiblen Server. Vorhandene Medien und Git-Objekte bleiben erhalten.`,
    pl_PL: `- Pole „Rola” w „Zarządzaj członkami” opisuje, co może każda rola.
- Pole klucza w „Ustaw właściciela relay” wyjaśnia, że właściciel jest zawsze członkiem i nie można go usunąć.
- Magazyn multimediów i git działa na Silo, serwerze zgodnym z MinIO. Istniejące multimedia i obiekty git zostają zachowane.`,
    fr_FR: `- Le champ Rôle de Gérer les membres décrit ce que chaque rôle permet de faire.
- Le champ de clé de Définir le propriétaire du relais explique que le propriétaire est toujours membre et ne peut pas être retiré.
- Le stockage des médias et de git fonctionne avec Silo, un serveur compatible MinIO. Les médias et objets git existants sont conservés.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
