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
  // gated by the critical task actions/setRelayUrl.ts raises).
  ownerPubkey: z.string().optional().catch(undefined),
  // The address the user has chosen for the relay, pending first start. Set
  // only by actions/setRelayUrl.ts, which init/seedFiles.ts raises as a
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
  // Display names for relay members, written only by actions/manageMembers.ts.
  // buzz-admin's roster has no name column, so the names are ours alone and
  // membership itself always comes from `buzz-admin list-members`. A list
  // rather than a pubkey-keyed object because FileHelper.merge unions object
  // keys — a removed member's name could then never be dropped.
  memberNames: z
    .array(z.object({ pubkey: z.string(), name: z.string() }))
    .catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
