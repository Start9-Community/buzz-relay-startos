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

The `buzz-relay` image runs as a non-root `buzz` user (uid 1000) internally. A one-shot `chown-git` daemon runs `chown -R 1000:1000` on the git data mount before the relay starts, since StartOS's volume storage doesn't otherwise match the image's expected ownership.

## Volume and Data Layout

| Volume | Contains | Notes |
| ------ | -------- | ----- |
| `main` | `store.json` (secrets/config), Redis data (`redis/`), MinIO data (`minio/`), git repo data (`git/`) | |
| `db`   | PostgreSQL data directory | Dedicated volume, not shared with `main` -- required by `sdk.Backups.withPgDump()`, which mounts its `dbVolume` at the root with no subpath |

`store.json` holds internal secrets generated at install (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, MinIO keys, `BUZZ_RELAY_PRIVATE_KEY`, `BUZZ_GIT_HOOK_HMAC_SECRET`) plus two user-provided values: the owner's Nostr pubkey and the relay's chosen address.

## Installation and First-Run Flow

This package skips Buzz's interactive setup entirely:

- Every internal secret (database/cache passwords, MinIO keys, the relay's signing key, the git-hook HMAC secret) is generated automatically at install -- nothing to configure.
- The relay address defaults automatically to the LAN `.local` address on install.
- **One thing is not automatic and blocks first start:** the relay's owner identity. A critical task appears immediately after install prompting for the owner's Nostr public key (`npub1...` or 64-character hex) -- the service will not start until this is set.
- Migrations run automatically on every start (`BUZZ_AUTO_MIGRATE=true`) -- the upstream image embeds them, but the flag itself defaults off in the raw binary and must be set explicitly.

## Configuration Management

| StartOS-Managed                                                                 | Upstream-Managed                        |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| All database/cache/storage credentials, the relay's signing key                  | Everything reachable through Buzz's own web UI / REST API once running |
| `RELAY_OWNER_PUBKEY` (via the **Set Relay Owner** action)                        | Channel structure, membership beyond the owner, agent identities |
| `RELAY_URL` / `BUZZ_DOMAIN` / `BUZZ_CORS_ORIGINS` / `BUZZ_MEDIA_BASE_URL` (via the **Set Relay Address/URL** action, auto-defaulted) | |
| Membership mode: hardcoded closed (`BUZZ_REQUIRE_AUTH_TOKEN=true`, `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`) -- no open-registration option in this package | |

## Network Access and Interfaces

Two interfaces, both type `api`:

| Interface | Port | Purpose |
| --------- | ---- | ------- |
| `relay` | 3000 | WebSocket relay, REST API, and Buzz's small bundled web UI, all on one port |
| `pairing` | 5000 | `buzz-pair-relay`, a separate process bundled in the same image, for NIP-AB mobile device pairing (scanning a QR code from the Buzz mobile app) |

StartOS's `schemeOverride` makes both show as `ws://`/`wss://` in the Interfaces tab rather than `http://`/`https://`, matching what Buzz Desktop and other Nostr clients actually dial. Both are reachable via whatever gateways the user enables -- LAN, Tor, a clearnet domain, Tailscale, or a Cloudflare/StartTunnel tunnel -- with no special-casing per gateway. The `relay` address is user-selectable (**Set Relay Address/URL** action); the `pairing` address auto-defaults to the LAN address and has no manual override in this version, since pairing is inherently a same-LAN action.

**Not yet verified against a real install** -- the pairing sidecar is new in this version; the QR pairing flow itself hasn't been confirmed working end-to-end yet.

## Actions (StartOS UI)

| Action | Purpose | Availability | Input | Output |
| ------ | ------- | ------------- | ----- | ------ |
| **Set Relay Owner** (`set-owner-pubkey`) | Set the Nostr identity that owns and administers this relay | Only when stopped | `npub1...` or 64-char hex pubkey (explicitly rejects an `nsec1...` private key with a clear error) | -- |
| **Set Relay Address/URL** (`set-relay-url`) | Choose which reachable address Buzz Desktop and invite links should use | Any status | Select from currently available addresses | -- |
| **Add Member** (`add-member`) | Register a new Nostr identity on the relay | Only when running | `npub1...`/hex pubkey + role (member/admin) | `buzz-admin`'s confirmation text |
| **Remove Member** (`remove-member`) | Remove a member (never the owner -- `buzz-admin` itself refuses that) | Only when running | Select from current members | `buzz-admin`'s confirmation text |
| **List Members** (`list-members`) | Show current membership and roles | Only when running | -- | Current roster |

**Not yet verified against a real install** -- these three wrap `buzz-admin` (bundled in the same image) via `sdk.SubContainer.withTemp()`; typechecked, but not yet packed or exercised against a live relay.

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

1. **Closed relay only.** No open-registration mode -- membership is owner-invite-only. Upstream supports both.
2. **Mobile app pairing and the member-management actions are implemented but not yet verified against a real install** (see the Network Access and Actions sections above). If either doesn't work as described, that's the current known risk area, not a documented-and-confirmed feature.
3. **The relay's owner pubkey and address are chosen once via StartOS actions**, not upstream's interactive setup wizard -- this package never runs it.

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
  - add-member
  - remove-member
  - list-members
```
