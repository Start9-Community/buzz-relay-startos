import { i18n } from './i18n'
import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import {
  MINIO_BUCKET,
  MINIO_PORT,
  PAIRING_PATH,
  PAIRING_PORT,
  POSTGRES_DB,
  POSTGRES_PATH,
  POSTGRES_USER,
  PROXY_PORT,
  RELAY_HEALTH_PORT,
  RELAY_PORT,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Buzz Relay!'))

  // Mapped read: only the fields that feed daemon env, so writing boundRelayUrl
  // just below doesn't re-run setupMain and bounce the whole daemon graph.
  const store = await storeJson
    .read((s) => ({
      pgPassword: s.pgPassword,
      redisPassword: s.redisPassword,
      minioAccessKey: s.minioAccessKey,
      minioSecretKey: s.minioSecretKey,
      relayPrivateKey: s.relayPrivateKey,
      gitHookHmacSecret: s.gitHookHmacSecret,
      ownerPubkey: s.ownerPubkey,
      relayUrl: s.relayUrl,
    }))
    .const(effects)

  const pgPassword = store?.pgPassword ?? ''
  const redisPassword = store?.redisPassword ?? ''
  const minioAccessKey = store?.minioAccessKey ?? ''
  const minioSecretKey = store?.minioSecretKey ?? ''
  const relayPrivateKey = store?.relayPrivateKey ?? ''
  const gitHookHmacSecret = store?.gitHookHmacSecret ?? ''
  const ownerPubkey = store?.ownerPubkey ?? ''

  // First start binds the community to whichever address the user settled on;
  // every start after that serves that same host regardless of what relayUrl
  // now says. Read non-reactively and kept out of the projection above: the
  // bind write must not invalidate this context. See store.json.ts.
  const bound = await storeJson.read((s) => s.boundRelayUrl).once()
  const relayUrl = bound ?? store?.relayUrl ?? ''
  if (relayUrl && !bound)
    await storeJson.merge(effects, { boundRelayUrl: relayUrl })
  const relayHostname = relayUrl ? new URL(relayUrl).hostname : ''
  // Caddy serves the pairing sidecar at PAIRING_PATH on this same address, so
  // there is nothing to look up or store -- it is the community's own URL.
  const pairingUrl = relayUrl ? new URL(PAIRING_PATH, relayUrl).href : ''

  /**
   * ======================== PostgreSQL sidecar ========================
   * Dedicated instance for this package only — not a shared StartOS dependency.
   */
  const postgresSub = sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: POSTGRES_PATH,
      readonly: false,
    }),
    'postgres',
  )

  /**
   * ======================== Redis sidecar ========================
   * Buzz's own reference deployment persists Redis with --appendonly yes and
   * a data volume (not the typical ephemeral-cache pattern) — pub/sub and
   * presence state survive a restart. Mirrored here rather than the generic
   * "cache is ephemeral" recipe.
   */
  const redisSub = sdk.SubContainer.of(
    effects,
    { imageId: 'redis' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: 'redis',
      mountpoint: '/data',
      readonly: false,
    }),
    'redis',
  )

  /**
   * ======================== MinIO sidecar ========================
   * Required by the relay for git object storage and media uploads (see
   * Phase 0 spike: not boot-blocking, but needed for real use).
   */
  const minioSub = sdk.SubContainer.of(
    effects,
    { imageId: 'minio' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: 'minio',
      mountpoint: '/data',
      readonly: false,
    }),
    'minio',
  )

  /**
   * ======================== Buzz Relay (primary) ========================
   */
  const relaySub = sdk.SubContainer.of(
    effects,
    { imageId: 'buzz-relay' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: 'git',
      mountpoint: '/data/git',
      readonly: false,
    }),
    'buzz-relay',
  )

  /**
   * ======================== Mobile pairing sidecar ========================
   * A third binary bundled in the same image (buzz-pair-relay), for QR-code
   * mobile device pairing. No persistent storage of its own.
   */
  const pairingSub = sdk.SubContainer.of(
    effects,
    { imageId: 'buzz-relay' },
    sdk.Mounts.of(),
    'pairing-relay',
  )

  /**
   * ======================== Caddy (public entrypoint) ========================
   * The only process StartOS binds. Everything else listens on loopback.
   */
  const caddySub = sdk.SubContainer.of(
    effects,
    { imageId: 'caddy' },
    sdk.Mounts.of().mountAssets({
      subpath: 'Caddyfile',
      mountpoint: '/etc/caddy/Caddyfile',
      type: 'file',
    }),
    'caddy',
  )

  return (
    sdk.Daemons.of(effects)
      .addDaemon('postgres', {
        subcontainer: postgresSub,
        exec: {
          command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
          env: {
            POSTGRES_DB: POSTGRES_DB,
            POSTGRES_USER: POSTGRES_USER,
            POSTGRES_PASSWORD: pgPassword,
          },
        },
        ready: {
          display: null, // internal sidecar
          fn: async () => {
            const result = await postgresSub.exec([
              'pg_isready',
              '-q',
              '-h',
              '127.0.0.1',
              '-U',
              POSTGRES_USER,
              '-d',
              POSTGRES_DB,
            ])
            return result.exitCode === 0
              ? { result: 'success', message: i18n('PostgreSQL is ready') }
              : {
                  result: 'loading',
                  message: i18n('Waiting for PostgreSQL to be ready'),
                }
          },
        },
        requires: [],
      })
      .addDaemon('redis', {
        subcontainer: redisSub,
        exec: {
          command: sdk.useEntrypoint([
            '--requirepass',
            redisPassword,
            '--appendonly',
            'yes',
          ]),
        },
        ready: {
          display: null, // internal sidecar
          fn: async () => {
            const result = await redisSub.exec([
              'redis-cli',
              '--no-auth-warning',
              '-a',
              redisPassword,
              'ping',
            ])
            return result.exitCode === 0 &&
              result.stdout.toString().trim() === 'PONG'
              ? { result: 'success', message: i18n('Redis is ready') }
              : {
                  result: 'loading',
                  message: i18n('Waiting for Redis to be ready'),
                }
          },
        },
        requires: [],
      })
      .addDaemon('minio', {
        subcontainer: minioSub,
        exec: {
          command: sdk.useEntrypoint([
            'server',
            '/data',
            '--console-address',
            ':9001',
          ]),
          env: {
            MINIO_ROOT_USER: minioAccessKey,
            MINIO_ROOT_PASSWORD: minioSecretKey,
          },
        },
        ready: {
          // Shown, unlike the other sidecars: the relay's own /_readiness
          // checks Postgres and Redis but never S3, so a broken object store is
          // invisible while every media upload and git push fails.
          display: i18n('Media & Git Storage'),
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://127.0.0.1:${MINIO_PORT}/minio/health/live`,
              {
                successMessage: i18n('Media and git storage are reachable'),
                errorMessage: i18n(
                  'Media and git storage are unreachable — uploads and git operations will fail',
                ),
              },
            ),
        },
        requires: [],
      })
      // One-shot: create the media bucket. Runs every start (idempotent via
      // --ignore-existing), mirrors deploy/compose/compose.yml's minio-init.
      .addOneshot('minio-init', {
        subcontainer: sdk.SubContainer.of(
          effects,
          { imageId: 'minio-mc' },
          sdk.Mounts.of(),
          'minio-mc',
        ),
        exec: {
          command: [
            '/bin/sh',
            '-euc',
            `mc alias set local http://127.0.0.1:${MINIO_PORT} "${minioAccessKey}" "${minioSecretKey}" && ` +
              `mc mb --ignore-existing "local/${MINIO_BUCKET}" && ` +
              `mc anonymous set none "local/${MINIO_BUCKET}"`,
          ],
        },
        requires: ['minio'],
      })
      // One-shot: the image runs as a non-root 'buzz' user (uid 1000, gid
      // 1000 -- see its Dockerfile) and pre-chowns /data/git to buzz:buzz,
      // but our volume mount shadows that with StartOS's own volume storage,
      // so buzz-relay can't write its git pack cache without this. An
      // idmap on the mount ({fromId: 0, toId: 1000}) did NOT fix it in
      // practice (tested on a real box) -- an explicit chown as root, the
      // same pattern ghost-startos/nextcloud-startos use, does. Runs every
      // start; idempotent.
      .addOneshot('chown-git', {
        subcontainer: relaySub,
        exec: {
          command: ['chown', '-R', '1000:1000', '/data/git'],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('pairing-relay', {
        subcontainer: pairingSub,
        exec: {
          command: ['/usr/local/bin/buzz-pair-relay'],
          env: {
            // Loopback, matching the binary's own default. It runs with no auth
            // and no persistence and leaves path restriction and connection
            // limiting to the proxy, so it must never be bound publicly.
            BUZZ_PAIR_RELAY_BIND_ADDR: `127.0.0.1:${PAIRING_PORT}`,
          },
        },
        ready: {
          display: null, // liveness only; a failure restarts the service
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, PAIRING_PORT, {
              successMessage: i18n('Mobile pairing is ready'),
              errorMessage: i18n('Mobile pairing is not ready'),
            }),
          // Same race as caddy below. This binary binds almost immediately so it
          // has been winning it, but nothing guarantees that.
          gracePeriod: 30_000,
        },
        requires: [],
      })
      .addDaemon('buzz-relay', {
        subcontainer: relaySub,
        exec: {
          command: sdk.useEntrypoint(),
          env: {
            BUZZ_BIND_ADDR: `127.0.0.1:${RELAY_PORT}`,
            BUZZ_HEALTH_PORT: String(RELAY_HEALTH_PORT),
            DATABASE_URL: `postgres://${POSTGRES_USER}:${pgPassword}@127.0.0.1:5432/${POSTGRES_DB}`,
            REDIS_URL: `redis://:${redisPassword}@127.0.0.1:6379`,
            BUZZ_S3_ENDPOINT: `http://127.0.0.1:${MINIO_PORT}`,
            BUZZ_S3_ADDRESSING_STYLE: 'path',
            BUZZ_S3_ACCESS_KEY: minioAccessKey,
            BUZZ_S3_SECRET_KEY: minioSecretKey,
            BUZZ_S3_BUCKET: MINIO_BUCKET,
            BUZZ_GIT_REPO_PATH: '/data/git',
            // Opt-in in the raw binary (unlike the Helm chart's default) — see
            // Phase 0 spike. Migrations are embedded via sqlx::migrate!, so no
            // separate migrate oneshot is needed.
            BUZZ_AUTO_MIGRATE: 'true',
            BUZZ_RELAY_PRIVATE_KEY: relayPrivateKey,
            BUZZ_GIT_HOOK_HMAC_SECRET: gitHookHmacSecret,
            // Closed-relay-only v1 (see project decision log).
            BUZZ_REQUIRE_AUTH_TOKEN: 'true',
            BUZZ_REQUIRE_RELAY_MEMBERSHIP: 'true',
            BUZZ_ALLOW_NIP_OA_AUTH: 'true',
            // Set via the set-owner-pubkey action, which actions/setRelayUrl.ts
            // raises as a critical task — the service can't start until it is.
            RELAY_OWNER_PUBKEY: ownerPubkey,
            // Already ws/wss: schemeOverride in interfaces.ts.
            RELAY_URL: relayUrl,
            BUZZ_DOMAIN: relayHostname,
            BUZZ_MEDIA_BASE_URL: `https://${relayHostname}/media`,
            BUZZ_CORS_ORIGINS: `https://${relayHostname}`,
            // Published as `pairing_relay_url` in the relay's NIP-11 document,
            // which is how a Buzz client discovers the pairing sidecar — so it
            // has to be an address that client can actually reach. Sharing the
            // relay's host (interfaces.ts) is what guarantees that.
            BUZZ_PAIRING_RELAY_URL: pairingUrl,
          },
        },
        ready: {
          display: i18n('Buzz Relay'),
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://127.0.0.1:${RELAY_HEALTH_PORT}/_readiness`,
              {
                successMessage: i18n('Buzz Relay is ready'),
                errorMessage: i18n('Buzz Relay is not ready'),
              },
            ),
          // First boot runs migrations before the health port comes up.
          gracePeriod: 60_000,
        },
        // pairing-relay: upstream's own compose.pairing.yml has the main
        // relay depend_on pairing-relay's service_started (not healthy) --
        // mirrored here so the relay never starts before it exists.
        requires: [
          'postgres',
          'redis',
          'minio-init',
          'chown-git',
          'pairing-relay',
        ],
      })
      .addDaemon('caddy', {
        subcontainer: caddySub,
        exec: { command: sdk.useEntrypoint() },
        ready: {
          display: null, // liveness only; a failure restarts the service
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, PROXY_PORT, {
              successMessage: i18n('The relay is reachable'),
              errorMessage: i18n('The relay is not reachable'),
            }),
          // checkPortListening reports `failure`, not `starting`, before the
          // port is bound, and a failed daemon restarts the service. Caddy takes
          // about a second to adapt its config and listen, so without this the
          // first poll can land in that gap and crash-loop the whole package.
          gracePeriod: 30_000,
        },
        // Both are loopback-only, so nothing is reachable until Caddy is up.
        requires: ['buzz-relay', 'pairing-relay'],
      })
  )
})
