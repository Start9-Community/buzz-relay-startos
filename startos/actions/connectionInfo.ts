import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const connectionInfo = sdk.Action.withoutInput(
  'connection-info',
  async () => ({
    name: i18n('Connection Information'),
    description: i18n(
      'Show the address to give people joining this community, and the owner identity that administers it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const store = await storeJson.read().once()
    // boundRelayUrl once the relay has started, the pending choice before that.
    const relayUrl = store?.boundRelayUrl ?? store?.relayUrl

    if (!relayUrl) {
      return {
        version: '1',
        title: i18n('Connection Information'),
        message: i18n(
          'This relay has no address yet. Complete the Set Relay Address/URL task first.',
        ),
        result: { type: 'group', value: [] },
      }
    }

    return {
      version: '1',
      title: i18n('Connection Information'),
      message: i18n(
        'In Buzz Desktop choose "Join a Community" and enter the community address below.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Community Address'),
            description: i18n(
              'Permanent. This community exists only at this address.',
            ),
            value: relayUrl,
            masked: false,
            copyable: true,
            qr: true,
          },
          {
            type: 'single',
            name: i18n('Owner Public Key'),
            description: i18n(
              'The Nostr identity that administers this relay.',
            ),
            value: store?.ownerPubkey ?? '',
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Mobile Pairing Address'),
            description: i18n(
              'Used only while scanning a QR code to add a phone. Change it with Set Pairing Address/URL.',
            ),
            value: store?.pairingUrl ?? '',
            masked: false,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
