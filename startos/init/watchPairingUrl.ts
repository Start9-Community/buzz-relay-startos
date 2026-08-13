import { setPairingUrl } from '../actions/setPairingUrl'
import { getPairingUrls } from '../interfaces'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// Safe to auto-default and to repoint on drift, unlike the relay address:
// buzz-pair-relay resolves no community, so this only decides what NIP-11
// advertises. The LAN default frequently does not work -- the mobile app's TLS
// stack rejects the box's self-signed certificate -- so the drift task is the
// user's cue to pick a tunnel or clearnet address instead.
export const watchPairingUrl = sdk.setupOnInit(async (effects) => {
  const urls = await getPairingUrls(effects)
  const current = await storeJson.read((s) => s.pairingUrl).const(effects)

  if (current && urls.includes(current)) return

  const fallback = urls.find((u) => u.includes('.local')) ?? urls[0]
  if (!fallback) return

  await storeJson.merge(
    effects,
    { pairingUrl: fallback },
    { allowWriteAfterConst: true },
  )
  if (current) {
    await sdk.action.createOwnTask(effects, setPairingUrl, 'important', {
      reason: i18n(
        'Your pairing address changed because the previous one is no longer available',
      ),
    })
  }
})
