import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
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
})
