import { utils } from '@start9labs/start-sdk'
import { setRelayUrl } from '../actions/setRelayUrl'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  await storeJson.merge(effects, {
    pgPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 22 }),
    redisPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 22 }),
    minioAccessKey: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 20 }),
    minioSecretKey: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 40 }),
    // 32 random bytes as hex — matches how Buzz's own .env.example expects
    // BUZZ_RELAY_PRIVATE_KEY / BUZZ_GIT_HOOK_HMAC_SECRET to be generated.
    relayPrivateKey: utils.getDefaultString({ charset: '0-9,a-f', len: 64 }),
    gitHookHmacSecret: utils.getDefaultString({ charset: '0-9,a-f', len: 64 }),
  })

  // Head of the setup chain: the address is permanent, so it is chosen first
  // and setRelayUrl raises the owner-pubkey task once it is answered.
  await sdk.action.createOwnTask(effects, setRelayUrl, 'critical', {
    reason: i18n('Choose the permanent address/URL of your Buzz relay'),
  })
})
