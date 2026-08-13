// Ports the buzz-relay binary binds inside its own subcontainer, matching
// deploy/compose/compose.yml in block/buzz.
export const RELAY_PORT = 3000
export const RELAY_HEALTH_PORT = 8080
// NIP-AB mobile device pairing sidecar (buzz-pair-relay, bundled in the same
// image). Matches upstream's own compose.pairing.yml default port.
export const PAIRING_PORT = 5000

export const MINIO_PORT = 9000
export const MINIO_BUCKET = 'buzz-media'

// Shared between main.ts (daemon setup) and backups.ts (withPgDump) so the
// two agree on where Postgres actually lives.
export const POSTGRES_PATH = '/var/lib/postgresql'
export const POSTGRES_DB = 'buzz'
export const POSTGRES_USER = 'buzz'
