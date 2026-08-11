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
