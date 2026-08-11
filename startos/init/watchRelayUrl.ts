import { setRelayUrl } from '../actions/setRelayUrl'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// Permanent, like Synapse's server_name — see store.json.ts. Critical task:
// the relay can't start without RELAY_URL, and its host anchors tenant
// resolution, so this is a one-time choice, not a reactive watcher.
export const watchRelayUrl = sdk.setupOnInit(async effects => {
  const store = await storeJson.read().const(effects)

  if (!store?.relayHostname) {
    await sdk.action.createOwnTask(effects, setRelayUrl, 'critical', {
      reason: i18n('Choose the permanent address this relay is reachable at before it can start'),
    })
  }
})
