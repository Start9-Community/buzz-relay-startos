import { sdk } from './sdk'

// TODO(Phase 5): raw-copying the whole 'main' volume while Postgres is a live
// daemon is not crash-consistent. Swap the postgresql subpath to
// sdk.Backups.withPgDump() (dump + restore handled automatically) and keep
// ofVolumes for the redis/minio/git subpaths.
export const { createBackup, restoreInit } = sdk.setupBackups(async ({ effects }) => sdk.Backups.ofVolumes('main'))
