import { setPairingUrl } from '../actions/setPairingUrl'
import { getPairingUrls } from '../interfaces'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// Same auto-default/drift-repair pattern as watchRelayUrl.ts. Originally
// this had no drift notification, on the assumption pairing would always
// stay LAN-only -- wrong in practice (a real install needed a tunnel
// address, because the mobile app's TLS stack doesn't trust the box's
// local self-signed cert). Now mirrors relay's behavior exactly.
export const watchPairingUrl = sdk.setupOnInit(async effects => {
  const urls = await getPairingUrls(effects)
  const current = await storeJson.read(s => s.pairingUrl).const(effects)

  if (!current) {
    await storeJson.merge(effects, { pairingUrl: urls.find(u => u.includes('.local')) }, { allowWriteAfterConst: true })
  } else if (!urls.includes(current)) {
    await storeJson.merge(effects, { pairingUrl: urls.find(u => u.includes('.local')) }, { allowWriteAfterConst: true })
    await sdk.action.createOwnTask(effects, setPairingUrl, 'important', {
      reason: i18n('Your pairing address changed because the previous one is no longer available'),
    })
  }
})
