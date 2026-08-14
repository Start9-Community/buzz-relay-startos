import { T } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { execBuzzAdmin, parseMembers, toHexPubkey } from '../utils'

const { InputSpec, List, Value } = sdk

const inputSpec = InputSpec.of({
  members: Value.list(
    List.obj(
      {
        name: i18n('Members'),
        description: i18n(
          'Everyone allowed on this relay besides the owner. Removing someone revokes their access immediately; changes apply when you save.',
        ),
      },
      {
        // Someone who joined through one of Buzz's own invite links has no name
        // here until an admin gives them one, so the row falls back to the key
        // rather than rendering blank.
        displayAs: '{{#name}}{{name}}{{/name}}{{^name}}{{pubkey}}{{/name}}',
        uniqueBy: 'pubkey',
        spec: InputSpec.of({
          name: Value.text({
            name: i18n('Name'),
            description: i18n(
              'What to call this person, so you can tell members apart. StartOS stores this name; the relay and Buzz clients never see it.',
            ),
            required: true,
            masked: false,
            default: null,
            minLength: null,
            maxLength: null,
          }),
          pubkey: Value.text({
            name: i18n('Nostr Public Key'),
            description: i18n(
              "This person's Nostr identity. Paste their npub (starts with npub1) or its 64-character hex public key.",
            ),
            required: true,
            masked: false,
            default: null,
            patterns: [
              {
                regex:
                  '^([0-9a-fA-F]{64}|npub1[a-z0-9]{58}|nsec1[a-z0-9]{58})$',
                description: i18n(
                  'Must be an npub1... address or a 64-character hex key',
                ),
              },
            ],
            minLength: null,
            maxLength: null,
          }),
          role: Value.select({
            name: i18n('Role'),
            description: i18n(
              'Admins can add and remove other members; members can only read and write.',
            ),
            default: 'member',
            values: {
              member: i18n('Member'),
              admin: i18n('Admin'),
            },
          }),
        }),
      },
    ),
  ),
})

export const manageMembers = sdk.Action.withInput(
  'manage-members',
  async () => ({
    name: i18n('Manage Members'),
    description: i18n(
      'Add, remove, rename, and set the role of everyone allowed on this relay.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => {
    const names = new Map(
      ((await storeJson.read((s) => s.memberNames).once()) ?? []).map((m) => [
        m.pubkey,
        m.name,
      ]),
    )

    return {
      members: (await currentMembers(effects)).map((m) => ({
        name: names.get(m.pubkey) ?? '',
        ...m,
      })),
    }
  },
  async ({ effects, input }) => {
    const desired = input.members.map((m) => {
      if (m.pubkey.trim().toLowerCase().startsWith('nsec1')) {
        throw new Error(
          i18n(
            "That looks like a private key (nsec), not a public key. Paste the member's npub (or its hex public key) instead.",
          ),
        )
      }
      return {
        name: m.name.trim(),
        pubkey: toHexPubkey(m.pubkey),
        role: m.role,
      }
    })

    // An npub and its own hex form pass the form's uniqueBy, which compares the
    // raw strings.
    if (new Set(desired.map((m) => m.pubkey)).size !== desired.length) {
      throw new Error(
        i18n(
          'The same Nostr identity is listed twice. Each member can appear only once.',
        ),
      )
    }

    const ownerPubkey = await storeJson.read((s) => s.ownerPubkey).once()
    if (ownerPubkey && desired.some((m) => m.pubkey === ownerPubkey)) {
      throw new Error(
        i18n(
          "That is the relay owner's own key. The owner is always a member — change that identity with Set Relay Owner.",
        ),
      )
    }

    const current = await currentMembers(effects)
    const desiredRoles = new Map(desired.map((m) => [m.pubkey, m.role]))
    const currentRoles = new Map(current.map((m) => [m.pubkey, m.role]))

    // buzz-admin's add-member is ON CONFLICT DO NOTHING, so a role change is a
    // removal followed by an add rather than an update.
    for (const m of current) {
      if (desiredRoles.get(m.pubkey) !== m.role) {
        await execBuzzAdmin(effects, ['remove-member', '--pubkey', m.pubkey], {
          write: true,
        })
      }
    }
    for (const m of desired) {
      if (currentRoles.get(m.pubkey) !== m.role) {
        await execBuzzAdmin(
          effects,
          ['add-member', '--pubkey', m.pubkey, '--role', m.role],
          { write: true },
        )
      }
    }

    await storeJson.merge(effects, {
      memberNames: desired.map(({ pubkey, name }) => ({ pubkey, name })),
    })
  },
)

// The owner is a member row like any other, but buzz-admin refuses to remove it
// and rejects 'owner' as a role, so it is never part of the editable list --
// the Set Relay Owner action is what changes that identity.
async function currentMembers(effects: T.Effects) {
  const output = await execBuzzAdmin(effects, ['list-members'], {
    write: false,
  })

  return parseMembers(output)
    .filter((m) => m.role !== 'owner')
    .map((m) => ({
      pubkey: m.pubkey,
      role: m.role === 'admin' ? ('admin' as const) : ('member' as const),
    }))
}
