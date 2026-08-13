import { T } from '@start9labs/start-sdk'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { PAIRING_PORT, RELAY_PORT } from './utils'

// Host ids (the sdk.MultiHost.of groups) and interface ids — exported so
// actions/setRelayUrl.ts and setPairingUrl.ts can look these up at runtime.
export const relayHostId = 'relay'
export const relayInterfaceId = 'relay'
export const pairingHostId = 'pairing'
export const pairingInterfaceId = 'pairing'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const relayMulti = sdk.MultiHost.of(effects, relayHostId)
  const relayOrigin = await relayMulti.bindPort(RELAY_PORT, {
    protocol: 'http',
    preferredExternalPort: RELAY_PORT,
  })

  // WS relay + REST API + a small bundled web UI all live on this one port.
  // schemeOverride shows ws/wss instead of http/https in StartOS's own
  // Interfaces tab, matching what Buzz Desktop / Nostr clients actually dial.
  const relay = sdk.createInterface(effects, {
    name: i18n('Buzz Relay'),
    id: relayInterfaceId,
    description: i18n(
      'WebSocket relay and API endpoint for Buzz Desktop and other Nostr clients',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'wss', noSsl: 'ws' },
    username: null,
    path: '',
    query: {},
  })

  // NIP-AB mobile device pairing sidecar (buzz-pair-relay) -- a separate
  // process on its own port, so it gets its own interface rather than a
  // path on the main one.
  const pairingMulti = sdk.MultiHost.of(effects, pairingHostId)
  const pairingOrigin = await pairingMulti.bindPort(PAIRING_PORT, {
    protocol: 'http',
    preferredExternalPort: PAIRING_PORT,
  })

  const pairing = sdk.createInterface(effects, {
    name: i18n('Mobile Pairing'),
    id: pairingInterfaceId,
    description: i18n(
      'Pairing endpoint the Buzz mobile app connects to when scanning a QR code',
    ),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'wss', noSsl: 'ws' },
    username: null,
    path: '',
    query: {},
  })

  return [
    await relayOrigin.export([relay]),
    await pairingOrigin.export([pairing]),
  ]
})

function getInterfaceAddresses(
  effects: T.Effects,
  hostId: string,
  interfaceId: string,
  domainsOnly: boolean,
): Promise<string[]> {
  return sdk.host
    .getOwn(effects, hostId, (host) => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap((b) => Object.values(b.interfaces))
          .find((i) => i.id === interfaceId)
      if (!iface) return []
      return domainsOnly
        ? iface.addressInfo
            .filter({
              visibility: 'public',
              // `kind: 'domain'` alone also matches 'private-domain', which is
              // LAN-only and never publicly resolvable. This is as far as
              // package code can narrow it: `HostnameInfo` carries no ACME
              // provider, so whether the certificate is actually Let's
              // Encrypt's rather than StartOS's local CA is the user's choice
              // when they add the domain -- which is why the action's warning
              // names Let's Encrypt explicitly.
              predicate: (h) => h.metadata.kind === 'public-domain' && h.ssl,
            })
            .format()
        : iface.addressInfo.nonLocal.format()
    })
    .once()
}

// A publicly-trusted domain, and nothing else. The relay's address is permanent
// (see store.json.ts), and upstream builds its WebSocket clients against
// tokio-tungstenite's `rustls-tls-webpki-roots` feature -- the Mozilla root set
// compiled into the binary, system trust store ignored. A .local address signed
// by this box's own CA, a private domain, and a .onion address no public CA can
// issue for are all rejected there no matter what the user installs on their
// device, so offering any of them would only let someone bind their community
// to an address its clients can never reach.
export function getRelayDomains(effects: T.Effects): Promise<string[]> {
  return getInterfaceAddresses(effects, relayHostId, relayInterfaceId, true)
}

// The pairing sidecar's address is not permanent and not a community key, so
// this one stays unrestricted -- LAN is the common case for QR pairing.
export function getPairingUrls(effects: T.Effects): Promise<string[]> {
  return getInterfaceAddresses(
    effects,
    pairingHostId,
    pairingInterfaceId,
    false,
  )
}
