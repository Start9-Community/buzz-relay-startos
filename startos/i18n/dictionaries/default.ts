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
  'The 64-character hex-encoded Nostr public key of the relay owner. This is the only identity that can administer this relay and approve new members.': 11,
  'Must be exactly 64 hexadecimal characters': 12,
  'Set Relay Owner': 13,
  'Set the Nostr public key that owns and administers this relay. Required before the relay can start.': 14,
  'Changing this after the relay has already started is not supported. Stop the service first.': 15,
  "Set the relay owner's Nostr public key before the relay can start": 16,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
