import { execBuzzAdmin, parseMembers } from '../buzzAdmin'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const listMembers = sdk.Action.withoutInput(
  'list-members',
  async () => ({
    name: i18n('List Members'),
    description: i18n(
      'Show everyone currently registered on this relay, and their role.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const output = await execBuzzAdmin(effects, ['list-members'], {
      write: false,
    })
    const members = parseMembers(output)

    if (members.length === 0) {
      return {
        version: '1',
        title: i18n('Relay Members'),
        message: i18n('No members are registered yet, other than the owner.'),
        result: { type: 'group', value: [] },
      }
    }

    return {
      version: '1',
      title: i18n('Relay Members'),
      message: i18n('Current relay membership.'),
      result: {
        type: 'group',
        value: members.map((m) => ({
          type: 'single' as const,
          name: m.role,
          description: null,
          value: m.pubkey,
          masked: false,
          copyable: true,
          qr: false,
        })),
      },
    }
  },
)
