import { T } from '@start9labs/start-sdk'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { PROXY_PORT } from './utils'

// One host, one binding, one interface -- Caddy's port. Both upstream processes
// sit behind it on loopback, so there is a single address to add a domain to and
// nothing to keep in sync. Adding a second binding would also reintroduce
// StartOS's public-domain isolation: a public domain is scoped to the binding it
// was added to and auto-disabled on every sibling, so a second binding would
// silently lose the domain (start-core, net/host/address.rs).
export const hostId = 'buzz'
export const relayInterfaceId = 'relay'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const multi = sdk.MultiHost.of(effects, hostId)
  const origin = await multi.bindPort(PROXY_PORT, {
    protocol: 'http',
    preferredExternalPort: PROXY_PORT,
  })

  // WS relay, REST API, the bundled web UI and the pairing sidecar all reach the
  // user through this one address. schemeOverride shows ws/wss instead of
  // http/https in StartOS's own Interfaces tab, matching what Buzz Desktop and
  // other Nostr clients actually dial.
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

  return [await origin.export([relay])]
})

// Domains, public or private (`kind: 'domain'` matches both). Buzz itself
// accepts any host; this narrows to the ones that still make sense years from
// now, because the binding cannot be revisited. A domain is a name its owner
// controls and resolves on 443; an mDNS name, a DHCP/ISP-assigned IP, and
// StartOS's high external ports all move. Those ports are the sharp edge --
// they are reassigned across reinstalls (observed: 58891 -> 58625 -> 50306),
// and a LAN or IP address carries one in its URL, so a restore onto a different
// box would strand the community permanently.
//
// The traversal stays inside the callback so `host` keeps its contextual type:
// `FilledHost` lives in start-core, which is nested under the SDK rather than a
// dependency of this package, so it cannot be imported to annotate a helper.
export function getRelayDomains(effects: T.Effects): Promise<string[]> {
  return sdk.host
    .getOwn(effects, hostId, (host) => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap((b) => Object.values(b.interfaces))
          .find((i) => i.id === relayInterfaceId)
      return iface ? iface.addressInfo.filter({ kind: 'domain' }).format() : []
    })
    .once()
}
