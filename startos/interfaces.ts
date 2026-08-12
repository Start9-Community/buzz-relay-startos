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
    description: i18n('WebSocket relay and API endpoint for Buzz Desktop and other Nostr clients'),
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
    description: i18n('Pairing endpoint the Buzz mobile app connects to when scanning a QR code'),
    type: 'api',
    masked: false,
    schemeOverride: { ssl: 'wss', noSsl: 'ws' },
    username: null,
    path: '',
    query: {},
  })

  return [await relayOrigin.export([relay]), await pairingOrigin.export([pairing])]
})

function getInterfaceUrls(effects: T.Effects, hostId: string, interfaceId: string): Promise<string[]> {
  return sdk.host
    .getOwn(effects, hostId, host => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap(b => Object.values(b.interfaces))
          .find(i => i.id === interfaceId)
      return iface ? iface.addressInfo.nonLocal.format() : []
    })
    .const()
}

// Every address the relay interface is currently reachable at -- LAN
// .local, Tor, clearnet, or a Tailscale/StartTunnel/Cloudflare-tunnel
// domain, once the user enables that gateway -- already scheme-corrected
// to ws/wss via schemeOverride above. Excludes only the internal loopback
// stub. Modeled on ghost-startos/gitea-startos's
// getNonLocalUrls/getHttpInterfaceUrls.
export function getRelayUrls(effects: T.Effects): Promise<string[]> {
  return getInterfaceUrls(effects, relayHostId, relayInterfaceId)
}

// Same, for the mobile-pairing interface.
export function getPairingUrls(effects: T.Effects): Promise<string[]> {
  return getInterfaceUrls(effects, pairingHostId, pairingInterfaceId)
}
