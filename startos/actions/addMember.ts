import { execBuzzAdmin } from '../buzzAdmin'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  pubkey: Value.text({
    name: i18n('Member Nostr Public Key'),
    description: i18n('The Nostr identity to add. Paste an npub (starts with npub1) or its 64-character hex public key.'),
    required: true,
    masked: false,
    default: null,
    patterns: [
      {
        regex: '^([0-9a-fA-F]{64}|npub1[a-z0-9]{58}|nsec1[a-z0-9]{58})$',
        description: i18n('Must be an npub1... address or a 64-character hex key'),
      },
    ],
    minLength: null,
    maxLength: null,
  }),
  role: Value.select({
    name: i18n('Role'),
    description: i18n('Admins can add and remove other members; members can only read and write.'),
    default: 'member',
    values: {
      member: i18n('Member'),
      admin: i18n('Admin'),
    },
  }),
})

export const addMember = sdk.Action.withInput(
  'add-member',
  async () => ({
    name: i18n('Add Member'),
    description: i18n('Register a new Nostr identity on this relay.'),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async () => ({}),
  async ({ effects, input }) => {
    const pubkey = input.pubkey.trim()
    if (pubkey.toLowerCase().startsWith('nsec1')) {
      throw new Error('That looks like a private key (nsec), not a public key. Paste the member\'s npub (or its hex public key) instead.')
    }

    const output = await execBuzzAdmin(effects, ['add-member', '--pubkey', pubkey, '--role', input.role], { write: true })

    return {
      version: '1',
      title: i18n('Member Added'),
      message: i18n('buzz-admin result:'),
      result: {
        type: 'single',
        name: i18n('Result'),
        description: null,
        value: output.trim(),
        masked: false,
        copyable: false,
        qr: false,
      },
    }
  },
)
