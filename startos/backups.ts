import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { POSTGRES_DB, POSTGRES_PATH, POSTGRES_USER } from './utils'

// withPgDump over a raw copy of the 'db' volume: StartOS already stops the
// service for the duration of a backup, so a raw copy would in fact be
// crash-consistent -- but it would also tie a restore to the exact Postgres
// major/minor version and page format the backup was taken with. A logical
// pg_dump restores cleanly across a future postgres:* image bump; a raw
// data-directory copy would not.
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.withPgDump({
    imageId: 'postgres',
    dbVolume: 'db',
    mountpoint: POSTGRES_PATH,
    pgdataPath: '/data',
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: async () => {
      const password = await storeJson.read((s) => s.pgPassword).once()
      if (!password) throw new Error('No pgPassword found in store.json')
      return password
    },
  }).addVolume('main'),
)
