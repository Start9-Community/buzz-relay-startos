import { T } from '@start9labs/start-sdk'
import { relayHostId, relayInterfaceId } from '../interfaces'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  hostname: Value.dynamicSelect(async ({ effects }) => getHostnames(effects)),
})

export const setRelayUrl = sdk.Action.withInput(
  'set-relay-url',
  async () => ({
    name: i18n('Set Relay Address/URL'),
    description: i18n('Choose the permanent address this relay is reachable at. Buzz Desktop and invite links use this to connect.'),
    warning: i18n(
      'This cannot be changed later without breaking existing invite links and connected clients. Enable the LAN, Tor, or clearnet address you want to use as primary under the Interfaces tab first.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'hidden',
  }),
  inputSpec,
  async () => ({}),
  async ({ effects, input }) => {
    await storeJson.merge(effects, { relayHostname: input.hostname })
  },
)

async function getHostnames(effects: T.Effects) {
  const hostnames =
    (await sdk.host
      .getOwn(effects, relayHostId, host => {
        const iface =
          host &&
          Object.values(host.bindings)
            .flatMap(b => Object.values(b.interfaces))
            .find(i => i.id === relayInterfaceId)
        return iface ? iface.addressInfo.filter({ kind: 'domain' }).hostnames.map(h => h.hostname) : []
      })
      .once()) || []

  return {
    name: i18n('Address/URL'),
    description: i18n('The hostname clients will use to reach this relay.'),
    warning: null,
    values: hostnames.reduce((obj: Record<string, string>, hostname: string) => ({ ...obj, [hostname]: hostname }), {}),
    default: hostnames[0] || '',
  }
}
