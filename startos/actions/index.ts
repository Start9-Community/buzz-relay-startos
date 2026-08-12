import { sdk } from '../sdk'
import { addMember } from './addMember'
import { listMembers } from './listMembers'
import { removeMember } from './removeMember'
import { setOwnerPubkey } from './setOwnerPubkey'
import { setRelayUrl } from './setRelayUrl'

export const actions = sdk.Actions.of()
  .addAction(setOwnerPubkey)
  .addAction(setRelayUrl)
  .addAction(addMember)
  .addAction(removeMember)
  .addAction(listMembers)
