import { getPairingUrls } from '../interfaces'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  url: Value.dynamicSelect(async ({ effects }) => {
    const urls = await getPairingUrls(effects)
    return {
      name: i18n('Pairing Address/URL'),
      description: i18n('The address the Buzz mobile app will use when scanning a QR code to pair.'),
      warning: null,
      values: urls.reduce((obj: Record<string, string>, url: string) => ({ ...obj, [url]: url }), {}),
      default: '',
    }
  }),
})

export const setPairingUrl = sdk.Action.withInput(
  'set-pairing-url',
  async () => ({
    name: i18n('Set Pairing Address/URL'),
    description: i18n('Choose which address the mobile app should use to pair with this relay.'),
    warning: i18n(
      "Only needed if the LAN address doesn't work for pairing -- for example, if your mobile app's own TLS trust store won't accept this box's local certificate. A tunnel or clearnet address avoids that.",
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => ({ url: (await storeJson.read(s => s.pairingUrl).once()) || undefined }),
  async ({ effects, input }) => {
    await storeJson.merge(effects, { pairingUrl: input.url })
  },
)
