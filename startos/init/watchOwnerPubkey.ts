import { setOwnerPubkey } from '../actions/setOwnerPubkey'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

// Closed-relay-only v1: the relay hard-fails its own bootstrap check without
// a valid owner pubkey (see Phase 0 spike notes), so this is a critical task
// -- the service cannot start until it's set. Idempotent by replayId: once
// ownerPubkey is stored, this is a no-op on every subsequent init.
export const watchOwnerPubkey = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().const(effects)

  if (!store?.ownerPubkey) {
    await sdk.action.createOwnTask(effects, setOwnerPubkey, 'critical', {
      reason: i18n(
        "Set the relay owner's Nostr public key before the relay can start",
      ),
    })
  }
})
