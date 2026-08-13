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
  // The address the user has chosen for the relay, pending first start. Set
  // only by actions/setRelayUrl.ts, which init/watchRelayUrl.ts raises as a
  // critical task — deliberately not auto-defaulted, because first start turns
  // this choice into boundRelayUrl below and it cannot be taken back.
  relayUrl: z.string().optional().catch(undefined),
  // The address the relay actually bound its community to, set once by main.ts
  // at first start. Upstream keys a community by RELAY_URL's authority
  // (`communities.host`, UNIQUE on lower(host), no alias table) and
  // `ensure_configured_community` creates a *new* empty community for any host
  // it hasn't seen — so re-pointing a running relay strands the original
  // community's members, channels and messages under the old host. Every
  // host-derived env var reads from this field, never from relayUrl.
  boundRelayUrl: z.string().optional().catch(undefined),
  // Address advertised as the mobile pairing endpoint. Unlike relayUrl this is
  // freely changeable at any time: buzz-pair-relay binds a port and resolves no
  // community, so the value only decides what NIP-11 advertises. Auto-defaulted
  // and drift-repaired by init/watchPairingUrl.ts.
  pairingUrl: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
