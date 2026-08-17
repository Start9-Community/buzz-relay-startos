import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { toHexPubkey } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  ownerPubkey: Value.text({
    name: i18n('Owner Nostr Public Key'),
    description: i18n(
      "The relay owner's Nostr identity: paste your npub (starts with npub1) or its 64-character hex public key. This is the only identity that can administer this relay and approve new members.",
    ),
    required: true,
    masked: false,
    default: null,
    patterns: [
      {
        regex: '^([0-9a-fA-F]{64}|npub1[a-z0-9]{58}|nsec1[a-z0-9]{58})$',
        description: i18n(
          'Must be an npub1... address or a 64-character hex key',
        ),
      },
    ],
    minLength: null,
    maxLength: null,
  }),
})

// No `only-stopped` and no `effects.restart()`: `ownerPubkey` is inside main's
// `.const()` store projection, so writing it invalidates that context and re-runs
// setupMain with the new RELAY_OWNER_PUBKEY. That reactive path works from an
// action's context via a filesystem watch; an explicit restart would double up.
export const setOwnerPubkey = sdk.Action.withInput(
  'set-owner-pubkey',
  async () => ({
    name: i18n('Set Relay Owner'),
    description: i18n(
      'Set the Nostr public key that owns and administers this relay. Required before the relay can start.',
    ),
    warning: i18n(
      'If the relay is running, saving this restarts it so the new owner takes effect.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => {
    const current = await storeJson.read((s) => s.ownerPubkey).once()
    return { ownerPubkey: current ?? '' }
  },
  async ({ effects, input }) => {
    const raw = input.ownerPubkey.trim()
    if (raw.toLowerCase().startsWith('nsec1')) {
      throw new Error(
        i18n(
          'That looks like a private key (nsec), not a public key. Paste your npub (or its hex public key) instead.',
        ),
      )
    }

    await storeJson.merge(effects, { ownerPubkey: toHexPubkey(raw) })
  },
)
