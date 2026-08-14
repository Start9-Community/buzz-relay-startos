<p align="center">
  <img src="icon.svg" alt="Buzz Relay Logo" width="21%">
</p>

# Buzz Relay on StartOS

> Everything not listed in this document should behave the same as upstream
> Buzz. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation
> section of `instructions.md` for links.

[Buzz](https://github.com/block/buzz) is a Nostr-based relay for private, invite-only communities. This package runs a closed, single-owner relay with PostgreSQL, Redis, and S3-compatible object storage bundled as private sidecars, plus a pairing sidecar for QR device pairing.

- **Upstream repo:** <https://github.com/block/buzz>
- **Wrapper repo:** <https://github.com/Start9-Community/buzz-relay-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Troubleshooting](#troubleshooting)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Four upstream images, unmodified. The relay's datastores are bundled rather than declared as StartOS dependencies, so everything below runs inside this one service.

| Property      | Value                                                    |
| ------------- | -------------------------------------------------------- |
| Images        | `ghcr.io/block/buzz`, `postgres`, `redis`, `minio/minio` |
| Architectures | x86_64, aarch64                                          |

| Subcontainer    | Image        | Purpose                                                          |
| --------------- | ------------ | ---------------------------------------------------------------- |
| `buzz-relay`    | `buzz-relay` | The relay itself — the daemon to `attach` to for relay logs      |
| `pairing-relay` | `buzz-relay` | Mobile pairing endpoint, served at `/pair`                       |
| `postgres`      | `postgres`   | Private database sidecar                                         |
| `redis`         | `redis`      | Private cache sidecar                                            |
| `minio`         | `minio`      | Private object storage for media and git objects                 |
| `caddy`         | `caddy`      | Reverse proxy; the only subcontainer bound to the published port |

Two oneshots run before the relay: `minio-init` (in a temporary `minio-mc` subcontainer) creates the media bucket, and `chown-git` fixes ownership of the persistent git path.

## Volume and Data Layout

Two volumes, and they are backed up by different mechanisms — see [Backups and Restore](#backups-and-restore).

| Volume | Purpose                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `main` | `store.json`, MinIO object storage, the git repository path, Redis state |
| `db`   | The PostgreSQL data directory, mounted at `/var/lib/postgresql`          |

## File Models

One model, `store.json`, and it holds both the service's generated secrets and the two fields that decide the relay's identity.

| File         | Format | Modelled                | Written by                                     |
| ------------ | ------ | ----------------------- | ---------------------------------------------- |
| `store.json` | JSON   | Yes — `FileHelper.json` | Install (`init/seedFiles.ts`), `main`, actions |

**Generated at install, never shown to the user:** `pgPassword`, `redisPassword`, `minioAccessKey`, `minioSecretKey`, `relayPrivateKey`, `gitHookHmacSecret`. These are internal wiring between the relay and its own sidecars; nothing asks the user for them and nothing displays them. `pgPassword` is additionally read at backup time, since the dump authenticates with it.

**Provided by the user:** `ownerPubkey`, a 64-character hex Nostr public key, set by [Set Relay Owner](#actions). It is deliberately not defaulted.

### `relayUrl` and `boundRelayUrl` — the distinction that matters

These two look redundant and are not. Confusing them is the most consequential mistake possible with this package.

- **`relayUrl`** is the address the user has _chosen_, pending first start. Only [Set Relay Address/URL](#actions) writes it.
- **`boundRelayUrl`** is the address the relay _actually bound its community to_, written once by `main` at first start. Every host-derived environment variable reads from this field, never from `relayUrl`.

Upstream keys a community by the authority of `RELAY_URL` — `communities.host`, unique on `lower(host)`, with no alias table — and `ensure_configured_community` creates a **new, empty community** for any host it has not seen before. So re-pointing a running relay at a different address does not move the community: it strands the original one's members, channels, and messages under the old host, and presents the user with an empty relay. `boundRelayUrl` exists precisely so that first start's choice cannot be silently overwritten.

**`memberNames`** holds display names for relay members, written only by [Manage Members](#actions). Membership itself always comes from `buzz-admin list-members` — upstream's roster has no name column, so the names are this package's alone. It is a list rather than a pubkey-keyed object because `FileHelper.merge` unions object keys, which would make a removed member's name impossible to drop.

## Dependencies

None. PostgreSQL, Redis, and object storage are bundled as private sidecars rather than declared as StartOS dependencies, so the relay does not share them with any other service.

## Network Access and Interfaces

One interface. Caddy fronts everything, so the relay and pairing ports are never published directly.

| Interface | Id      | Type | Port | Description                                      |
| --------- | ------- | ---- | ---- | ------------------------------------------------ |
| Relay     | `relay` | api  | 80   | Nostr relay, and the pairing endpoint at `/pair` |

Bound on the `buzz` MultiHost with `preferredExternalPort: 80`, not masked. Internally the relay listens on `3000` (health on `8080`), pairing on `5000`, and MinIO on `9000`; none of those are exposed.

## Installation and First-Run Flow

Install generates every internal secret into `store.json` (`init/seedFiles.ts`) and then **raises a critical task** — the relay cannot start until the user has chosen its address.

That ordering is deliberate rather than incidental. The address is not auto-defaulted because first start turns the choice into `boundRelayUrl` permanently, so the package refuses to guess on the user's behalf. See [Tasks](#tasks) for the sequence and [File Models](#file-models) for why it is irreversible.

## Actions

Two are user-facing. The third is hidden and reachable only through the task that raises it.

### Manage Members

Add or remove relay members and set their roles. Run it whenever the membership of the community changes.

- **What it changes:** the upstream roster via `buzz-admin`, plus `memberNames` in `store.json` for the display names upstream does not store.
- **Availability:** only while the service is running — it shells into the relay to read the live roster.
- **Repeat safety:** idempotent; it writes the full membership each time.

### Set Relay Owner

Sets the owner's Nostr public key. Run it when prompted by its task, or to hand the relay to a different owner.

- **What it changes:** `ownerPubkey` in `store.json`.
- **Repeat safety:** safe to re-run; the last value wins.

### Set Relay Address/URL — hidden

**Not user-facing in the Actions list.** It is `visibility: 'hidden'` and reachable only through the critical task that raises it, so a user is never told to go find it. It is also `only-stopped`, because the value it writes is consumed at first start.

- **What it changes:** `relayUrl` in `store.json`, which first start converts into `boundRelayUrl`.
- **Repeat safety:** effectively one-way. Changing it after the relay has bound does not move the community — see [File Models](#file-models).

## Tasks

Two tasks, both `critical`, and they run as a sequence: neither the relay's address nor its owner can be guessed, and it will not start without both.

| Task                  | Severity   | Raised when                                               | Cleared when    |
| --------------------- | ---------- | --------------------------------------------------------- | --------------- |
| Set Relay Address/URL | `critical` | At install, by `init/seedFiles.ts`                        | The action runs |
| Set Relay Owner       | `critical` | After the address is set, by the Set Relay Address action | The action runs |

`critical` blocks the service from starting and suspends the ordinary controls, so a user in this state sees only the task — which is the intended experience, not a fault. Because the second task is raised by the first action, the pair presents as a two-step setup wizard rather than two independent prompts.

## Health Checks

Six daemons report readiness, but only two are shown to the user. The rest pass `display: null` — they exist so a failing sidecar restarts the service, not to be read.

| Check           | Displayed as          | Method                                | Grace Period |
| --------------- | --------------------- | ------------------------------------- | ------------ |
| `buzz-relay`    | "Buzz Relay"          | HTTP check on the relay's health port | 60s          |
| `minio`         | "Media & Git Storage" | HTTP check on the MinIO port          | default      |
| `postgres`      | — internal            | sidecar readiness                     | default      |
| `redis`         | — internal            | sidecar readiness                     | default      |
| `pairing-relay` | — internal            | port `5000` listening                 | 30s          |
| `caddy`         | — internal            | port `80` listening                   | 30s          |

**A user reporting "no health checks shown but the service is restarting"** is seeing an internal check fail — the service page will not name which. Read the service logs and identify the subcontainer from them, since the internal checks are invisible by design.

## Backups and Restore

The two volumes are backed up by **different mechanisms**, which decides what a restore actually gives you.

- **`db` is dumped, not copied.** `Backups.withPgDump` runs `pg_dump` against the PostgreSQL data directory; the volume's files are never captured. This is deliberate: StartOS stops the service for a backup, so a raw copy would be crash-consistent, but it would tie the restore to the exact Postgres major, minor, and page format it was taken with. A logical dump restores cleanly across a future `postgres:*` image bump.
- **`main` is copied wholesale** via `.addVolume('main')` — `store.json`, MinIO objects, and the git path.

The dump authenticates with `pgPassword` from `store.json`, so the two halves are not independent: a restore needs both.

## Limitations and Differences

1. **The relay's address is permanent in practice.** First start binds the community to it, and re-pointing strands the original community rather than moving it — see [File Models](#file-models).
2. **Single-owner and closed by design.** One owner pubkey, and membership is managed only through the Manage Members action.
3. **The datastores are private.** PostgreSQL, Redis, and MinIO are sidecars of this service and cannot be shared with, or substituted by, other StartOS services.
4. **Member display names are local.** They live in `store.json`, not upstream, so they do not follow members to another relay.

## Troubleshooting

Nearly every failure specific to this package traces to one of two things: the setup tasks not being completed, or the relay's bound address having moved.

| Symptom                                                     | Check                                               | Resolution                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Service will not start; only a task is shown                | Are `relayUrl` and `ownerPubkey` both set?          | Complete both critical tasks — this is the intended install flow, not a fault       |
| Relay is empty after changing its address                   | Does `boundRelayUrl` differ from `relayUrl`?        | The original community is stranded under the old host; restore the previous address |
| Service restarts repeatedly with no failing check displayed | Which subcontainer is erroring in the service logs? | An internal (`display: null`) sidecar check is failing — diagnose from the logs     |
| Members present in the app do not show names                | Were they added outside Manage Members?             | Names come from `store.json`; re-run Manage Members to set them                     |
| Media or git objects missing after restore                  | Was the `main` volume included in the backup?       | MinIO objects live on `main`; a `db`-only restore recovers messages but not media   |

---

## Quick Reference for AI Consumers

```yaml
package_id: buzz-relay
image: ghcr.io/block/buzz # plus postgres, redis, minio/minio
architectures:
  - x86_64
  - aarch64
subcontainers:
  - buzz-relay
  - pairing-relay
  - postgres
  - redis
  - minio
  - caddy
volumes:
  main: store.json, MinIO objects, git path
  db: /var/lib/postgresql
file_models:
  - store.json
startos_managed_env_vars: []
dependencies: []
interfaces:
  relay: { type: api, port: 80 }
actions:
  - manage-members
  - set-owner-pubkey
  - set-relay-url # hidden; raised by task only
tasks:
  - { action: set-relay-url, severity: critical }
  - { action: set-owner-pubkey, severity: critical }
health_checks:
  - buzz-relay # displayed "Buzz Relay"
  - minio # displayed "Media & Git Storage"
  - postgres # internal
  - redis # internal
  - pairing-relay # internal
  - caddy # internal
```
