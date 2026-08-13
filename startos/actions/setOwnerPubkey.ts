import { decodeBech32 } from '../nostr'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

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

export const setOwnerPubkey = sdk.Action.withInput(
  'set-owner-pubkey',
  async () => ({
    name: i18n('Set Relay Owner'),
    description: i18n(
      'Set the Nostr public key that owns and administers this relay. Required before the relay can start.',
    ),
    warning: i18n(
      'Changing this after the relay has already started is not supported. Stop the service first.',
    ),
    allowedStatuses: 'only-stopped',
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
    const lower = raw.toLowerCase()

    let hex: string
    if (lower.startsWith('nsec1')) {
      throw new Error(
        i18n(
          'That looks like a private key (nsec), not a public key. Paste your npub (or its hex public key) instead.',
        ),
      )
    } else if (lower.startsWith('npub1')) {
      // decodeBech32's own errors are library diagnostics ("invalid bech32
      // checksum"); a mistyped npub clears the input pattern and lands here, so
      // translate at the boundary rather than leaking them into the alert.
      const decoded = (() => {
        try {
          return decodeBech32(lower)
        } catch {
          throw new Error(
            i18n(
              'That npub is not valid — check it for typos. Every character matters, and the key carries its own checksum, so a single wrong character makes the whole key unreadable.',
            ),
          )
        }
      })()
      if (decoded.prefix !== 'npub') {
        throw new Error(
          i18n('Expected an npub1... address, got a ${prefix}1... address.', {
            prefix: decoded.prefix,
          }),
        )
      }
      hex = decoded.hex
    } else {
      hex = lower
    }

    await storeJson.merge(effects, { ownerPubkey: hex })
  },
)
