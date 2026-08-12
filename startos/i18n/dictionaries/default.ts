export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Buzz Relay!': 0,
  'PostgreSQL is ready': 1,
  'Waiting for PostgreSQL to be ready': 2,
  'Redis is ready': 3,
  'Waiting for Redis to be ready': 4,
  'MinIO is ready': 5,
  'Waiting for MinIO to be ready': 6,
  'Buzz Relay': 7,
  'Buzz Relay is ready': 8,
  'Buzz Relay is not ready': 9,
  // actions/setOwnerPubkey.ts, init/watchOwnerPubkey.ts
  'Owner Nostr Public Key': 10,
  "The relay owner's Nostr identity: paste your npub (starts with npub1) or its 64-character hex public key. This is the only identity that can administer this relay and approve new members.": 11,
  'Must be an npub1... address or a 64-character hex key': 12,
  'Set Relay Owner': 13,
  'Set the Nostr public key that owns and administers this relay. Required before the relay can start.': 14,
  'Changing this after the relay has already started is not supported. Stop the service first.': 15,
  "Set the relay owner's Nostr public key before the relay can start": 16,
  // interfaces.ts, actions/setRelayUrl.ts, init/watchRelayUrl.ts
  'WebSocket relay and API endpoint for Buzz Desktop and other Nostr clients': 17,
  'Set Relay Address/URL': 18,
  'Choose which address Buzz Desktop and invite links should use to reach this relay.': 19,
  'Changing this does not update links you already shared — anyone using the old address will need the new one.': 20,
  'Address/URL': 21,
  'The address clients will use to reach this relay.': 22,
  'Your relay address changed because the previous one is no longer available': 23,
  // main.ts: media-storage health check, first-ready notification
  'Media & Git Storage': 24,
  'Media and git storage are reachable': 25,
  'Media and git storage are unreachable — uploads and git operations will fail': 26,
  'Buzz Relay is Ready': 27,
  'Connect Buzz Desktop using the address on the Interfaces tab.': 28,
  // interfaces.ts: mobile pairing interface
  'Mobile Pairing': 29,
  'Pairing endpoint the Buzz mobile app connects to when scanning a QR code': 30,
  // main.ts: pairing-relay daemon ready check
  'Mobile pairing is ready': 31,
  'Mobile pairing is not ready': 32,
  // actions/listMembers.ts, addMember.ts, removeMember.ts, buzzAdmin.ts
  'List Members': 33,
  'Show everyone currently registered on this relay, and their role.': 34,
  'No members are registered yet, other than the owner.': 35,
  'Relay Members': 36,
  'Current relay membership.': 37,
  'Member Nostr Public Key': 38,
  'The Nostr identity to add. Paste an npub (starts with npub1) or its 64-character hex public key.': 39,
  'Role': 40,
  'Admins can add and remove other members; members can only read and write.': 41,
  'Member': 42,
  'Admin': 43,
  'Add Member': 44,
  'Register a new Nostr identity on this relay.': 45,
  'Member Added': 46,
  'buzz-admin result:': 47,
  'Result': 48,
  'Who to remove. The relay owner is never listed here -- change RELAY_OWNER_PUBKEY instead.': 49,
  'Remove Member': 50,
  'Remove a Nostr identity from this relay.': 51,
  'This immediately revokes their access. They can be re-added later with Add Member.': 52,
  'Member Removed': 53,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
