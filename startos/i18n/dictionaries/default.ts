export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Buzz Relay!': 0,
  'PostgreSQL is ready': 1,
  'Waiting for PostgreSQL to be ready': 2,
  'Redis is ready': 3,
  'Waiting for Redis to be ready': 4,
  'Buzz Relay': 7,
  'Buzz Relay is ready': 8,
  'Buzz Relay is not ready': 9,
  // actions/setOwnerPubkey.ts, actions/setRelayUrl.ts
  'Owner Nostr Public Key': 10,
  "The relay owner's Nostr identity: paste your npub (starts with npub1) or its 64-character hex public key. This is the only identity that can administer this relay and approve new members.": 11,
  'Must be an npub1... address or a 64-character hex key': 12,
  'Set Relay Owner': 13,
  'Set the Nostr public key that owns and administers this relay. Required before the relay can start.': 14,
  'If the relay is running, saving this restarts it so the new owner takes effect.': 97,
  "Set the relay owner's Nostr public key before the relay can start": 16,
  // interfaces.ts, actions/setRelayUrl.ts, init/seedFiles.ts
  'WebSocket relay and API endpoint for Buzz Desktop and other Nostr clients': 17,
  'Set Relay Address/URL': 18,
  'Address/URL': 21,
  'Choose a permanent address/URL for your Buzz relay.': 19,
  "This can never be changed. You have two choices:<ul><li><b>Public domain</b> — anyone can join from anywhere, and the certificate is trusted automatically. The relay is reachable from the public internet.</li><li><b>Private domain</b> — stays on your own network or VPN and is never publicly exposed. Reachable only there, and every device that joins must first be told to trust this server's certificate.</li></ul>": 92,
  'The address clients will use to reach this relay. It becomes the permanent identity of your community.': 22,
  'No domain is switched on for the Buzz Relay interface yet. Add one under Interfaces and switch it on there — an address that is switched off is not offered here, because your community would be bound to one the server is not serving.': 91,
  'Choose the permanent address/URL of your Buzz relay': 60,
  // main.ts: media-storage health check
  'Media & Git Storage': 24,
  'Media and git storage are reachable': 25,
  'Media and git storage are unreachable — uploads and git operations will fail': 26,
  // main.ts: pairing-relay daemon ready display
  // main.ts: caddy daemon ready check
  'The relay is reachable': 89,
  'The relay is not reachable': 90,
  // main.ts: pairing-relay daemon ready check
  'Mobile pairing is ready': 31,
  'Mobile pairing is not ready': 32,
  // actions/manageMembers.ts
  'Manage Members': 76,
  'Add, remove, rename, and set the role of everyone allowed on this relay.': 77,
  Members: 78,
  'Everyone allowed on this relay besides the owner. Removing someone revokes their access immediately; changes apply when you save.': 79,
  Name: 80,
  'What to call this person, so you can tell members apart. StartOS stores this name; the relay and Buzz clients never see it.': 81,
  'Nostr Public Key': 82,
  "This person's Nostr identity. Paste their npub (starts with npub1) or its 64-character hex public key.": 83,
  Role: 40,
  'Admins can add and remove other members; members can only read and write.': 41,
  Member: 42,
  Admin: 43,
  // Thrown out of action handlers -- StartOS renders these as the user's alert,
  // so they are translated copy (actions.md, "Wrap User-Facing Strings").
  'That looks like a private key (nsec), not a public key. Paste your npub (or its hex public key) instead.': 61,
  // Interpolation is the SDK's `${name}` form, substituted once per key
  // (setupI18n uses String.replace with a string pattern, not a global regex),
  // so each placeholder appears exactly once.
  'Expected an npub1... address, got a ${prefix}1... address.': 62,
  "That looks like a private key (nsec), not a public key. Paste the member's npub (or its hex public key) instead.": 63,
  "This relay's community was created under ${bound} and upstream Buzz has no way to move it. Pointing the relay at ${chosen} would leave it serving a new, empty community while the original members, channels and messages stayed behind. To use a different address you must reinstall and start over.": 64,
  'That npub is not valid — check it for typos. Every character matters, and the key carries its own checksum, so a single wrong character makes the whole key unreadable.': 65,
  'The same Nostr identity is listed twice. Each member can appear only once.': 84,
  "That is the relay owner's own key. The owner is always a member — change that identity with Set Relay Owner.": 85,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
