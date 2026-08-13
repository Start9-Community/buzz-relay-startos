import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:1',
  releaseNotes: {
    en_US:
      'Real Buzz branding (icon, license, descriptions). Mobile QR pairing now works end-to-end, including a Set Pairing Address/URL action for boxes where the LAN default is unreachable by the mobile app. Added Add/Remove/List Member actions for managing relay membership from the StartOS UI.',
    es_ES:
      'Identidad visual real de Buzz (icono, licencia, descripciones). El emparejamiento móvil por QR ya funciona de extremo a extremo, incluyendo una acción para establecer la dirección de emparejamiento cuando la dirección LAN predeterminada no es accesible desde la app móvil. Se añadieron las acciones Añadir/Eliminar/Listar miembro para gestionar la membresía del relay desde la interfaz de StartOS.',
    de_DE:
      'Echtes Buzz-Branding (Symbol, Lizenz, Beschreibungen). Das mobile QR-Pairing funktioniert jetzt durchgängig, inklusive einer Aktion zum Festlegen der Pairing-Adresse für Boxen, bei denen die LAN-Standardadresse von der Mobile-App aus nicht erreichbar ist. Aktionen zum Hinzufügen/Entfernen/Auflisten von Mitgliedern wurden hinzugefügt, um die Relay-Mitgliedschaft über die StartOS-Oberfläche zu verwalten.',
    pl_PL:
      'Prawdziwy branding Buzz (ikona, licencja, opisy). Parowanie mobilne przez kod QR działa już od początku do końca, wraz z akcją ustawiania adresu parowania dla urządzeń, na których domyślny adres LAN jest niedostępny dla aplikacji mobilnej. Dodano akcje Dodaj/Usuń/Lista członków do zarządzania członkostwem w relay z interfejsu StartOS.',
    fr_FR:
      "Véritable identité visuelle Buzz (icône, licence, descriptions). L'appairage mobile par QR fonctionne désormais de bout en bout, avec une action pour définir l'adresse d'appairage lorsque l'adresse LAN par défaut n'est pas accessible depuis l'application mobile. Ajout des actions Ajouter/Supprimer/Lister un membre pour gérer l'adhésion au relais depuis l'interface StartOS.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
