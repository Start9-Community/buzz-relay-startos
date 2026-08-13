import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'buzz-relay',
  title: 'Buzz Relay',
  license: 'Apache-2.0', // matches upstream block/buzz
  packageRepo: 'https://github.com/tronsington/buzz-relay-startos',
  upstreamRepo: 'https://github.com/block/buzz',
  marketingUrl: 'https://buzz.xyz',
  donationUrl: null,
  description: { short, long },
  // 'db' is dedicated to Postgres (unshared) -- sdk.Backups.withPgDump()
  // mounts a dbVolume at its root with no subpath, so Postgres can't share
  // 'main' the way redis/minio/git do. See backups.ts.
  volumes: ['main', 'db'],
  images: {
    // Confirmed multi-arch (amd64 + arm64) via registry manifest inspection.
    // Upstream has no tagged semver image release, only ':main' (floating)
    // and per-commit 'sha-<7>' tags -- pinned to the commit this package has
    // actually been tested against (2026-08-12) rather than floating, so a
    // public sideload can't silently pull an untested image out from under
    // installers. Bump this pin deliberately, with a fresh test pass, not
    // as a side effect of an unrelated change.
    'buzz-relay': {
      source: { dockerTag: 'ghcr.io/block/buzz:sha-4749bc7' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:17-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    redis: {
      source: { dockerTag: 'redis:7-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    minio: {
      source: { dockerTag: 'minio/minio:RELEASE.2025-09-07T16-13-09Z' },
      arch: ['x86_64', 'aarch64'],
    },
    // Only used for the one-shot bucket-creation daemon, never the long-running server.
    'minio-mc': {
      source: { dockerTag: 'minio/mc:RELEASE.2025-08-13T08-35-41Z' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  // 2 GiB matches the relay's own Helm chart RAM limit and comfortably covers
  // real steady-state usage across all four daemons (see Phase 0 spike notes).
  hardwareRequirements: {
    ram: 2 * 1024 ** 3,
  },
  dependencies: {},
})
