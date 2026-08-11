// Constants shared across this package's startos/ code.
// Ports the buzz-relay binary binds inside its own subcontainer (see
// deploy/compose/compose.yml in block/buzz) — not yet exposed via an
// interface (that's Phase 4: interfaces.ts + URL wiring).
export const RELAY_PORT = 3000
export const RELAY_HEALTH_PORT = 8080

export const MINIO_PORT = 9000
export const MINIO_BUCKET = 'buzz-media'
