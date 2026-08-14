import { sdk } from '../sdk'
import { manageMembers } from './manageMembers'
import { setOwnerPubkey } from './setOwnerPubkey'
import { setRelayUrl } from './setRelayUrl'

export const actions = sdk.Actions.of()
  .addAction(setOwnerPubkey)
  .addAction(setRelayUrl)
  .addAction(manageMembers)
