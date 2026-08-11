import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.object({
  // Internal secrets, auto-generated at install (see init/seedFiles.ts).
  // Never shown to the user.
  pgPassword: z.string().catch(''),
  redisPassword: z.string().catch(''),
  minioAccessKey: z.string().catch(''),
  minioSecretKey: z.string().catch(''),
  relayPrivateKey: z.string().catch(''),
  gitHookHmacSecret: z.string().catch(''),
  // Owner's Nostr pubkey (64-char hex). Not auto-generated — the user
  // provides it via the set-owner-pubkey action (see actions/setOwnerPubkey.ts,
  // gated by the critical task in init/watchOwnerPubkey.ts).
  ownerPubkey: z.string().optional().catch(undefined),
  // Permanent hostname (bare, no scheme/port) the relay is reachable at —
  // chosen once via actions/setRelayUrl.ts, gated by init/watchRelayUrl.ts.
  // Treated as permanent (like Synapse's server_name) because Buzz's tenant
  // resolution keys off RELAY_URL's host (see Phase 0 spike notes).
  relayHostname: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json({ base: sdk.volumes.main, subpath: 'store.json' }, shape)
