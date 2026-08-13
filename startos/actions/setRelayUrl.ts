import { getRelayUrls } from '../interfaces'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  url: Value.dynamicSelect(async ({ effects }) => {
    const urls = await getRelayUrls(effects)
    return {
      name: i18n('Address/URL'),
      description: i18n('The address clients will use to reach this relay.'),
      warning: null,
      values: urls.reduce(
        (obj: Record<string, string>, url: string) => ({ ...obj, [url]: url }),
        {},
      ),
      default: urls.find((u) => u.includes('.local')) ?? urls[0] ?? '',
    }
  }),
})

export const setRelayUrl = sdk.Action.withInput(
  'set-relay-url',
  async () => ({
    name: i18n('Set Relay Address/URL'),
    description: i18n(
      'Choose which address Buzz Desktop and invite links use to reach this relay. This can only be set before the relay first starts.',
    ),
    warning: i18n(
      'Choose carefully: the relay creates its community under this exact address the first time it starts, and the address cannot be changed afterward. Clients reaching the relay at any other address will not find your community. If you intend to use a Tor, clearnet, or tunnel address, enable that gateway on the Interfaces tab before starting the relay.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async () => ({
    url: (await storeJson.read((s) => s.relayUrl).once()) || undefined,
  }),
  async ({ effects, input }) => {
    const bound = await storeJson.read((s) => s.boundRelayUrl).once()
    if (bound && bound !== input.url) {
      throw new Error(
        i18n(
          "This relay's community was created under ${bound} and upstream Buzz has no way to move it. Pointing the relay at ${chosen} would leave it serving a new, empty community while the original members, channels and messages stayed behind. To use a different address you must reinstall and start over.",
          { bound, chosen: input.url },
        ),
      )
    }
    await storeJson.merge(effects, { relayUrl: input.url })
  },
)
