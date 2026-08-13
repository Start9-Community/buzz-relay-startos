import { setRelayUrl } from '../actions/setRelayUrl'
import { getRelayUrls } from '../interfaces'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// The relay creates its community under RELAY_URL's host on first start and
// upstream has no way to move it (see store.json.ts), so the address is not
// auto-defaulted: a critical task makes the user choose it deliberately, while
// the service is still blocked from starting. Once main.ts has bound it, a
// missing address is reported for the user to restore -- never silently
// swapped for another, which would bind a second, empty community.
export const watchRelayUrl = sdk.setupOnInit(async (effects) => {
  const urls = await getRelayUrls(effects)
  const bound = await storeJson.read((s) => s.boundRelayUrl).const(effects)

  if (bound) {
    if (!urls.includes(bound)) {
      await sdk.action.createOwnTask(effects, setRelayUrl, 'important', {
        reason: i18n(
          'This relay is reachable only at the address its community was created under, and that address is currently unavailable. Re-enable the gateway that provides it.',
        ),
      })
    }
    return
  }

  const chosen = await storeJson.read((s) => s.relayUrl).const(effects)
  if (!chosen || !urls.includes(chosen)) {
    await sdk.action.createOwnTask(effects, setRelayUrl, 'critical', {
      reason: i18n(
        'Choose the address clients will use to reach this relay. The relay creates its community under this address the first time it starts and it cannot be changed afterward.',
      ),
    })
  }
})
