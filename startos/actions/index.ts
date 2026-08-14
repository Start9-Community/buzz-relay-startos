import { sdk } from '../sdk'
import { addMember } from './addMember'
import { connectionInfo } from './connectionInfo'
import { listMembers } from './listMembers'
import { removeMember } from './removeMember'
import { setOwnerPubkey } from './setOwnerPubkey'
import { setPairingUrl } from './setPairingUrl'
import { setRelayUrl } from './setRelayUrl'

export const actions = sdk.Actions.of()
  .addAction(connectionInfo)
  .addAction(setOwnerPubkey)
  .addAction(setRelayUrl)
  .addAction(setPairingUrl)
  .addAction(addMember)
  .addAction(removeMember)
  .addAction(listMembers)
