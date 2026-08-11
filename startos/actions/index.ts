import { sdk } from '../sdk'
import { setOwnerPubkey } from './setOwnerPubkey'

export const actions = sdk.Actions.of().addAction(setOwnerPubkey)
