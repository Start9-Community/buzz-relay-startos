// The one port StartOS binds. Caddy owns it and fans out to the two upstream
// processes below, neither of which is reachable from outside the container.
export const PROXY_PORT = 80

// Ports the buzz-relay binary binds inside its own subcontainer, matching
// deploy/compose/compose.yml in block/buzz. Loopback only -- Caddy fronts it.
export const RELAY_PORT = 3000
export const RELAY_HEALTH_PORT = 8080
// Device-pairing sidecar (buzz-pair-relay, bundled in the same image), on its
// own upstream default port. Loopback only, and deliberately so: it runs with
// no auth and no persistence, and delegates path restriction and connection
// limiting to the proxy (crates/buzz-pair-relay/src/lib.rs).
export const PAIRING_PORT = 5000
// Where Caddy exposes the pairing sidecar, and the path upstream's deployment
// notes prescribe. Advertised to clients as BUZZ_PAIRING_RELAY_URL.
export const PAIRING_PATH = '/pair'

export const MINIO_PORT = 9000
export const MINIO_BUCKET = 'buzz-media'

// Shared between main.ts (daemon setup) and backups.ts (withPgDump) so the
// two agree on where Postgres actually lives.
export const POSTGRES_PATH = '/var/lib/postgresql'
export const POSTGRES_DB = 'buzz'
export const POSTGRES_USER = 'buzz'
