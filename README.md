<p align="center">
  <img src="icon.svg" alt="Buzz Relay Logo" width="21%">
</p>

# Buzz Relay on StartOS

> **Upstream docs:** <https://github.com/block/buzz>
>
> Everything not listed in this document should behave the same as upstream Buzz.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable.

[Buzz](https://github.com/block/buzz) is a self-hostable team workspace built on
a Nostr relay -- channels, direct messages, git repos, media, and AI agents all
exist as signed events in one auditable log. This package runs Buzz as a
**closed, single-owner relay** on StartOS: one Rust binary (WebSocket relay +
REST API + a small bundled web UI) backed by its own PostgreSQL, Redis, and
MinIO instances, all bundled into one `.s9pk`.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Image        | Source                     | Purpose                                                         |
| ------------ | --------------------------- | ---------------------------------------------------------------- |
| `buzz-relay` | Upstream, unmodified        | The relay binary (WS + REST + bundled web UI), via `useEntrypoint()` |
| `postgres`   | Upstream, unmodified         | Event store, dedicated instance (not shared with other packages) |
| `redis`      | Upstream, unmodified         | Pub/sub, presence -- **persisted** (`--appendonly yes`), matching upstream's own reference deployment, not the generic "ephemeral cache" pattern |
| `minio`      | Upstream, unmodified         | S3-compatible object storage for git repos and media             |
| `minio-mc`   | Upstream, unmodified         | Used only by the one-shot bucket-creation daemon, never long-running |

All images are multi-arch (`x86_64` + `aarch64`), confirmed via registry manifest inspection.

The `buzz-relay` image runs as a non-root `buzz` user (uid 1000) internally. A `chown-git` oneshot runs `chown -R 1000:1000` on the git data mount before the relay starts, since StartOS's volume storage doesn't otherwise match the image's expected ownership.

Subcontainers are named `postgres`, `redis`, `minio`, `minio-mc`, `buzz-relay`, and `pairing-relay`; `buzz-admin` is the short-lived subcontainer the member actions run in. Pass these to `start-cli package attach -n`.

## Volume and Data Layout

| Volume | Contains | Notes |
| ------ | -------- | ----- |
| `main` | `store.json` (secrets/config), Redis data (`redis/`), MinIO data (`minio/`), git repo data (`git/`) | |
| `db`   | PostgreSQL data directory | Dedicated volume, not shared with `main` -- required by `sdk.Backups.withPgDump()`, which mounts its `dbVolume` at the root with no subpath |

`store.json` is the package's only file model. It is seeded at install with internal secrets (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, MinIO keys, `BUZZ_RELAY_PRIVATE_KEY`, `BUZZ_GIT_HOOK_HMAC_SECRET`) and is otherwise written only by the actions: the owner's Nostr pubkey, the chosen relay and pairing addresses, and `boundRelayUrl` -- the address the relay actually created its community under, written once by `main.ts` at first start and never rewritten. A hand edit survives until something rewrites that field, but editing `boundRelayUrl` by hand does not move the community; it only points the relay at a different one.

## Installation and First-Run Flow

This package skips Buzz's interactive setup entirely:

- Every internal secret (database/cache passwords, MinIO keys, the relay's signing key, the git-hook HMAC secret) is generated automatically at install -- nothing to configure.
- **A chain of critical tasks blocks first start**, following the `synapse-startos` pattern. Install raises **Set Relay Address/URL**; answering it raises **Set Relay Owner**. The service will not start until both are set. Neither action is browsable -- `set-relay-url` is `visibility: 'hidden'` and reached only through its task.
- The address is deliberately not auto-defaulted, and the picker offers public domains only. Upstream creates the relay's community under that address on first start and provides no way to move it, so the user has to add a domain to the interface before the task can be answered at all.
- Migrations run automatically on every start (`BUZZ_AUTO_MIGRATE=true`) -- the upstream image embeds them, but the flag itself defaults off in the raw binary and must be set explicitly.

## Configuration Management

| StartOS-Managed                                                                 | Upstream-Managed                        |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| All database/cache/storage credentials, the relay's signing key                  | Everything reachable through Buzz's own web UI / REST API once running |
| `RELAY_OWNER_PUBKEY` (via the **Set Relay Owner** action)                        | Channel structure, membership beyond the owner, agent identities |
| `RELAY_URL` / `BUZZ_DOMAIN` / `BUZZ_CORS_ORIGINS` / `BUZZ_MEDIA_BASE_URL` (all derived from the address chosen via **Set Relay Address/URL** before first start, then frozen -- see Limitations) | |
| Membership mode: hardcoded closed (`BUZZ_REQUIRE_AUTH_TOKEN=true`, `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`) -- no open-registration option in this package | |

## Network Access and Interfaces

Two interfaces, both type `api`:

| Interface | Port | Purpose |
| --------- | ---- | ------- |
| `relay` | 3000 | WebSocket relay, REST API, and Buzz's small bundled web UI, all on one port |
| `pairing` | 5000 | `buzz-pair-relay`, a separate process bundled in the same image, for NIP-AB mobile device pairing (scanning a QR code from the Buzz mobile app) |

StartOS's `schemeOverride` makes both show as `ws://`/`wss://` in the Interfaces tab rather than `http://`/`https://`, matching what Buzz Desktop and other Nostr clients actually dial. StartOS will serve both interfaces over whatever gateways the user enables -- LAN, Tor, a clearnet domain, Tailscale, or a Cloudflare/StartTunnel tunnel -- with no special-casing per gateway.

The two interfaces differ in how freely their advertised address can change. **Pairing** is a stateless sidecar, so **Set Pairing Address/URL** can be re-run at any time. **Relay** is not: upstream resolves a community from the connection's host and stores it in a single `communities.host` column, so only the one address the community was created under reaches it. **Set Relay Address/URL** is therefore a pre-first-start choice and refuses to change afterward. See Limitations.

The LAN `.local` address does not work for `pairing` with Buzz Desktop's own pairing client -- its TLS stack doesn't trust the box's local self-signed certificate the way a browser that's installed the StartOS root CA does (`WebSocket connection failed: IO error: invalid peer certificate: UnknownIssuer`). Point **Set Pairing Address/URL** at a Tor, clearnet, or tunnel address instead.

## Actions (StartOS UI)

| Action | Purpose | Availability | Input | Output |
| ------ | ------- | ------------- | ----- | ------ |
| **Set Relay Owner** (`set-owner-pubkey`) | Set the Nostr identity that owns and administers this relay | Only when stopped | `npub1...` or 64-char hex pubkey (explicitly rejects an `nsec1...` private key with a clear error) | -- |
| **Set Relay Address/URL** (`set-relay-url`) | Choose the permanent address the community is created under. Rejects any change once bound. `visibility: 'hidden'` -- not user-browsable, raised as a task | Only when stopped | Select from public domains on the relay interface | -- |
| **Set Pairing Address/URL** (`set-pairing-url`) | Choose which reachable address the mobile app should use to pair | Any status | Select from currently available addresses | -- |
| **Add Member** (`add-member`) | Register a new Nostr identity on the relay | Only when running | `npub1...`/hex pubkey + role (member/admin) | `buzz-admin`'s confirmation text |
| **Remove Member** (`remove-member`) | Remove a member (never the owner -- `buzz-admin` itself refuses that) | Only when running | Select from current members | `buzz-admin`'s confirmation text |
| **List Members** (`list-members`) | Show current membership and roles | Only when running | -- | Current roster |
| **Connection Information** (`connection-info`) | Show the community address (with QR), owner pubkey, and pairing address in one place. Read-only, repeat-safe | Any status | -- | The three values, copyable |

Add/Remove/List Member all wrap `buzz-admin` (bundled in the same image) via `sdk.SubContainer.withTemp()`. `buzz-admin` resolves which community it is acting on from `RELAY_URL`'s host, so these actions operate on the community the relay bound at first start.

Tasks chain rather than appearing together. `seedFiles` raises **Set Relay Address/URL** `critical` on install; its handler raises **Set Relay Owner** `critical` in turn. Each blocks the service from starting and clears when its value is set. Nothing re-raises them afterward, and the package never substitutes an address of its own choosing.

## Backups and Restore

- PostgreSQL: logical dump via `sdk.Backups.withPgDump()` -- portable across future image/Postgres version bumps, unlike a raw data-directory copy.
- The `main` volume (secrets, Redis data, MinIO data, git repo data): included via `addVolume`.
- Restore re-applies both together; no separate restore steps.

## Health Checks

| Check | Method | Notes |
| ----- | ------ | ----- |
| `postgres` (internal) | `pg_isready` | Not shown to the user |
| `redis` (internal) | `redis-cli ping` | Not shown to the user |
| `minio` (internal) | `GET /minio/health/live` | Not shown to the user |
| `pairing-relay` | Port-listening check on the pairing sidecar's port | Shown to the user (not internal) |
| **Buzz Relay** | `GET /_readiness` on the relay's internal health port | 60s grace period (first-boot migrations); only checks Postgres/Redis upstream, not S3 -- see next row |
| **Media & Git Storage** | `GET /minio/health/live`, standalone check gated on the relay being healthy | Added specifically because the relay's own `/_readiness` does not check S3 -- without this, a broken object-storage connection would otherwise be invisible even though it breaks every media upload and git push |

## Dependencies

None. PostgreSQL, Redis, and MinIO are bundled as private sidecars dedicated to this package, not shared StartOS dependencies.

## Limitations and Differences

1. **One address, chosen before first start, permanent thereafter.** Upstream resolves a request's community from its connection host, stores that host in `communities.host` (`UNIQUE` on `lower(host)`, with no alias table), and creates a *new, empty* community for any host it has not seen. So a relay serves exactly one of the box's addresses no matter how many gateways StartOS exposes, and re-pointing it would leave the original members, channels and messages stranded under the old host with no upstream path to move them. This package binds the address at first start and refuses to change it; moving to a different address means reinstalling.

   **The address picker offers public domains only.** Upstream builds its WebSocket clients against `tokio-tungstenite`'s `rustls-tls-webpki-roots` feature — the Mozilla root set compiled into the binary, with the system trust store ignored — so a CA the user installs on their device changes nothing for those clients. A `.onion` address cannot be served over `wss` at all, since no public CA issues for `.onion`, and the LAN `.local` address is signed by the box's own CA and rejected on that path (confirmed for mobile pairing: `invalid peer certificate: UnknownIssuer`). Offering either would only let someone bind their community permanently to an address its clients can never reach, so `getRelayDomains` filters the select to `{ kind: 'domain' }`, matching `synapse-startos`'s treatment of its equally-permanent `server_name`.
2. **Closed relay only.** No open-registration mode -- membership is owner-invite-only. Upstream supports both.
3. **The relay's owner pubkey and address are chosen via StartOS actions**, not upstream's interactive setup wizard -- this package never runs it.
4. **The pairing sidecar's LAN address is unusable with the current mobile pairing client** -- see Network Access and Interfaces.

## What Is Unchanged from Upstream

Everything reachable through Buzz's own web UI, REST API, and Nostr protocol behavior once the relay is running: channels, messages, git repo hosting, media handling, agent identities, invite links, and NIP compliance all work exactly as upstream Buzz documents.

## Contributing

See [AGENTS.md](AGENTS.md).

---

## Quick Reference for AI Consumers

```yaml
package_id: buzz-relay
architectures: [x86_64, aarch64]
volumes:
  main: /data (store.json, redis/, minio/, git/)
  db: PostgreSQL data directory (root of volume)
ports:
  relay: 3000
  pairing: 5000
dependencies: none
startos_managed_env_vars:
  - POSTGRES_PASSWORD
  - REDIS_PASSWORD
  - BUZZ_S3_ACCESS_KEY
  - BUZZ_S3_SECRET_KEY
  - BUZZ_RELAY_PRIVATE_KEY
  - BUZZ_GIT_HOOK_HMAC_SECRET
  - BUZZ_AUTO_MIGRATE
  - BUZZ_REQUIRE_AUTH_TOKEN
  - BUZZ_REQUIRE_RELAY_MEMBERSHIP
  - RELAY_OWNER_PUBKEY
  - RELAY_URL
  - BUZZ_DOMAIN
  - BUZZ_CORS_ORIGINS
  - BUZZ_MEDIA_BASE_URL
  - BUZZ_PAIRING_RELAY_URL
actions:
  - set-owner-pubkey
  - set-relay-url
  - set-pairing-url
  - add-member
  - remove-member
  - list-members
```
