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
  // provides it. TODO(Phase 3): add the setup Task + Action that writes this;
  // until then it stays empty and the relay daemon fails its readiness check
  // (BUZZ_REQUIRE_RELAY_MEMBERSHIP requires a valid owner pubkey to boot).
  ownerPubkey: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json({ base: sdk.volumes.main, subpath: 'store.json' }, shape)
