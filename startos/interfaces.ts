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
        ? iface.addressInfo.filter({ kind: 'domain' }).format()
        : iface.addressInfo.nonLocal.format()
    })
    .once()
}

// Domains, public or private (`kind: 'domain'` matches both). Buzz itself
// accepts any host; this narrows to the ones that still make sense years from
// now, because the binding cannot be revisited. A domain is a name its owner
// controls and resolves on 443; an mDNS name, a DHCP/ISP-assigned IP, and
// StartOS's high external ports all move. Those ports are the sharp edge --
// they are reassigned across reinstalls (observed: 58891 -> 58625 -> 50306),
// and a LAN or IP address carries one in its URL, so a restore onto a different
// box would strand the community permanently. Whether a given domain's
// certificate is publicly trusted is reported by the client-reachability health
// check in main.ts rather than pre-judged here.
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
