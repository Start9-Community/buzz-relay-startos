import { T } from '@start9labs/start-sdk'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { RELAY_PORT } from './utils'

// Host id (the sdk.MultiHost.of group) and interface id — exported so
// actions/setRelayUrl.ts can look this interface's hostnames up at runtime.
export const relayHostId = 'relay'
export const relayInterfaceId = 'relay'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const multi = sdk.MultiHost.of(effects, relayHostId)
  const origin = await multi.bindPort(RELAY_PORT, {
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

  return [await origin.export([relay])]
})

// Every address this interface is currently reachable at -- LAN .local,
// Tor, clearnet, or a Tailscale/StartTunnel/Cloudflare-tunnel domain, once
// the user enables that gateway -- already scheme-corrected to ws/wss via
// schemeOverride above. Excludes only the internal loopback stub. Modeled on
// ghost-startos/gitea-startos's getNonLocalUrls/getHttpInterfaceUrls.
export function getRelayUrls(effects: T.Effects): Promise<string[]> {
  return sdk.host
    .getOwn(effects, relayHostId, host => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap(b => Object.values(b.interfaces))
          .find(i => i.id === relayInterfaceId)
      return iface ? iface.addressInfo.nonLocal.format() : []
    })
    .const()
}
