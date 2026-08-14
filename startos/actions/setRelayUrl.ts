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
      // An address switched off for this interface is not offered: binding the
      // community to one StartOS is not serving would strand it permanently.
      description: domains.length
        ? i18n(
            'The address clients will use to reach this relay. It becomes the permanent identity of your community.',
          )
        : i18n(
            'No domain is switched on for the Buzz Relay interface yet. Add one under Interfaces and switch it on there — an address that is switched off is not offered here, because your community would be bound to one the server is not serving.',
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
      "This can never be changed. You have two choices:<ul><li><b>Public domain</b> — anyone can join from anywhere, and the certificate is trusted automatically. The relay is reachable from the public internet.</li><li><b>Private domain</b> — stays on your own network or VPN and is never publicly exposed. Reachable only there, and every device that joins must first be told to trust this server's certificate.</li></ul>",
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
