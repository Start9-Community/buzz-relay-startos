import { getRelayDomains } from '../interfaces'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { setOwnerPubkey } from './setOwnerPubkey'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  url: Value.dynamicSelect(async ({ effects }) => {
    const domains = await getRelayDomains(effects)
    return {
      name: i18n('Address/URL'),
      description: i18n(
        'The address clients will use to reach this relay. It becomes the permanent identity of your community.',
      ),
      warning: null,
      values: domains.reduce(
        (obj: Record<string, string>, url: string) => ({ ...obj, [url]: url }),
        {},
      ),
      default: domains[0] || '',
    }
  }),
})

export const setRelayUrl = sdk.Action.withInput(
  'set-relay-url',
  async () => ({
    name: i18n('Set Relay Address/URL'),
    description: i18n('Choose a permanent address/URL for your Buzz relay.'),
    warning: i18n(
      'This can never be changed. Every device that joins must trust this address\u2019s certificate: a public domain added to the Buzz Relay interface with Let\u2019s Encrypt works everywhere, while the local address requires installing this server\u2019s root certificate on every device.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'hidden',
  }),
  inputSpec,
  async () => ({}),
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

    await sdk.action.createOwnTask(effects, setOwnerPubkey, 'critical', {
      reason: i18n(
        "Set the relay owner's Nostr public key before the relay can start",
      ),
    })
  },
)
