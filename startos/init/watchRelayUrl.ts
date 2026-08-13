import { setRelayUrl } from '../actions/setRelayUrl'
import { getRelayUrls } from '../interfaces'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// Auto-defaults to the LAN .local address on install -- matches the
// ghost-startos/gitea-startos "changeable URL" convention, not a blocking
// setup task. If the active address is later removed (its gateway got
// disabled), falls back to .local again and raises a non-blocking notice --
// silently swapping the address a running relay is reachable at could orphan
// invite links or connected clients without warning.
export const watchRelayUrl = sdk.setupOnInit(async (effects) => {
  const urls = await getRelayUrls(effects)
  const current = await storeJson.read((s) => s.relayUrl).const(effects)

  if (!current) {
    await storeJson.merge(
      effects,
      { relayUrl: urls.find((u) => u.includes('.local')) },
      { allowWriteAfterConst: true },
    )
  } else if (!urls.includes(current)) {
    await storeJson.merge(
      effects,
      { relayUrl: urls.find((u) => u.includes('.local')) },
      { allowWriteAfterConst: true },
    )
    await sdk.action.createOwnTask(effects, setRelayUrl, 'important', {
      reason: i18n(
        'Your relay address changed because the previous one is no longer available',
      ),
    })
  }
})
