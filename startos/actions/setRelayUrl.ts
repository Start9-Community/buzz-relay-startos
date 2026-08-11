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
      values: urls.reduce((obj: Record<string, string>, url: string) => ({ ...obj, [url]: url }), {}),
      default: '',
    }
  }),
})

export const setRelayUrl = sdk.Action.withInput(
  'set-relay-url',
  async () => ({
    name: i18n('Set Relay Address/URL'),
    description: i18n('Choose which address Buzz Desktop and invite links should use to reach this relay.'),
    warning: i18n('Changing this does not update links you already shared — anyone using the old address will need the new one.'),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => ({ url: (await storeJson.read(s => s.relayUrl).once()) || undefined }),
  async ({ effects, input }) => {
    await storeJson.merge(effects, { relayUrl: input.url })
  },
)
