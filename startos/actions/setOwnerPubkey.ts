import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  ownerPubkey: Value.text({
    name: i18n('Owner Nostr Public Key'),
    description: i18n(
      'The 64-character hex-encoded Nostr public key of the relay owner. This is the only identity that can administer this relay and approve new members.',
    ),
    required: true,
    masked: false,
    default: null,
    patterns: [
      {
        regex: '^[0-9a-fA-F]{64}$',
        description: i18n('Must be exactly 64 hexadecimal characters'),
      },
    ],
    minLength: 64,
    maxLength: 64,
  }),
})

export const setOwnerPubkey = sdk.Action.withInput(
  'set-owner-pubkey',
  async () => ({
    name: i18n('Set Relay Owner'),
    description: i18n('Set the Nostr public key that owns and administers this relay. Required before the relay can start.'),
    warning: i18n('Changing this after the relay has already started is not supported. Stop the service first.'),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => {
    const current = await storeJson.read(s => s.ownerPubkey).once()
    return { ownerPubkey: current ?? '' }
  },
  async ({ effects, input }) => {
    await storeJson.merge(effects, { ownerPubkey: input.ownerPubkey.toLowerCase() })
  },
)
