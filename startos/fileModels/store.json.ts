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
  // Full ws(s):// URL the relay is currently reachable at (LAN .local by
  // default, or Tor/clearnet/Tailscale/StartTunnel/Cloudflare once the user
  // enables one of those gateways and picks it). Auto-defaulted and kept in
  // sync by init/watchRelayUrl.ts; changeable anytime via
  // actions/setRelayUrl.ts, matching the ghost-startos/gitea-startos
  // "changeable URL" convention rather than a permanent one-time choice.
  relayUrl: z.string().optional().catch(undefined),
  // Same auto-default/live-repair pattern as relayUrl, for the mobile
  // pairing sidecar's own interface (see interfaces.ts's getPairingUrls
  // and init/watchPairingUrl.ts). No manual-override action for this one
  // in v1 -- pairing is inherently a same-LAN action, so LAN auto-default
  // covers the common case.
  pairingUrl: z.string().optional().catch(undefined),
  // One-shot gate for the "relay is ready" notification (main.ts) -- keeps a
  // polling health check from reposting it every 30s after the first success.
  firstReadyNotified: z.boolean().catch(false),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
