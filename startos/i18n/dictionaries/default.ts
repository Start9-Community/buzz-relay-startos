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
  'Address/URL': 21,
  'Choose a permanent address/URL for your Buzz relay.': 19,
  'This can never be changed. You must first add a public domain to the Buzz Relay interface, using Let’s Encrypt as the certificate provider.': 20,
  'The address clients will use to reach this relay. It becomes the permanent identity of your community.': 22,
  'Choose the permanent address/URL of your Buzz relay': 60,
  'This relay is reachable only at the address its community was created under, and that address is currently unavailable. Re-enable the gateway that provides it.': 23,
  // main.ts: media-storage health check
  'Media & Git Storage': 24,
  'Media and git storage are reachable': 25,
  'Media and git storage are unreachable — uploads and git operations will fail': 26,
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
  Role: 40,
  'Admins can add and remove other members; members can only read and write.': 41,
  Member: 42,
  Admin: 43,
  'Add Member': 44,
  'Register a new Nostr identity on this relay.': 45,
  'Member Added': 46,
  'buzz-admin result:': 47,
  Result: 48,
  'Who to remove. The relay owner is not listed -- use Set Relay Owner to change that identity.': 49,
  'Remove Member': 50,
  'Remove a Nostr identity from this relay.': 51,
  'This immediately revokes their access. They can be re-added later with Add Member.': 52,
  'Member Removed': 53,
  // actions/setPairingUrl.ts, init/watchPairingUrl.ts
  'Pairing Address/URL': 54,
  'The address the Buzz mobile app will use when scanning a QR code to pair.': 55,
  'Set Pairing Address/URL': 56,
  'Choose which address the mobile app should use to pair with this relay.': 57,
  "Only needed if the LAN address doesn't work for pairing -- for example, if your mobile app's own TLS trust store won't accept this box's local certificate. A tunnel or clearnet address avoids that.": 58,
  'Your pairing address changed because the previous one is no longer available': 59,
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
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
