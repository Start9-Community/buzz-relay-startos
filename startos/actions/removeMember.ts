import { execBuzzAdmin, parseMembers } from '../buzzAdmin'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  pubkey: Value.dynamicSelect(async ({ effects }) => {
    const output = await execBuzzAdmin(effects, ['list-members'], { write: false })
    const members = parseMembers(output)

    return {
      name: i18n('Member'),
      description: i18n('Who to remove. The relay owner is never listed here -- change RELAY_OWNER_PUBKEY instead.'),
      warning: null,
      values: members.reduce((obj: Record<string, string>, m) => ({ ...obj, [m.pubkey]: `${m.pubkey} (${m.role})` }), {}),
      default: '',
    }
  }),
})

export const removeMember = sdk.Action.withInput(
  'remove-member',
  async () => ({
    name: i18n('Remove Member'),
    description: i18n('Remove a Nostr identity from this relay.'),
    warning: i18n('This immediately revokes their access. They can be re-added later with Add Member.'),
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async () => ({}),
  async ({ effects, input }) => {
    const output = await execBuzzAdmin(effects, ['remove-member', '--pubkey', input.pubkey], { write: true })

    return {
      version: '1',
      title: i18n('Member Removed'),
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
