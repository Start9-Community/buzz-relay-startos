import { getPairingUrls } from '../interfaces'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

// Same auto-default pattern as watchRelayUrl.ts, minus the drift
// notification: there's no set-pairing-url action for the user to run in
// v1 (pairing is inherently a same-LAN action), so a task pointing nowhere
// would be noise. Just silently re-picks .local if the current pick
// disappears (matches gitea-startos's simpler variant of this pattern).
export const watchPairingUrl = sdk.setupOnInit(async effects => {
  const urls = await getPairingUrls(effects)
  const current = await storeJson.read(s => s.pairingUrl).const(effects)

  if (!current || !urls.includes(current)) {
    await storeJson.merge(effects, { pairingUrl: urls.find(u => u.includes('.local')) }, { allowWriteAfterConst: true })
  }
})
