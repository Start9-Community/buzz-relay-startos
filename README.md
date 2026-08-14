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
REST API) backed by its own PostgreSQL, Redis, and MinIO instances, fronted by
Caddy, all bundled into one `.s9pk`.

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
| `buzz-relay` | Upstream, unmodified        | The relay binary -- WebSocket relay, REST API, and the static bundle behind invite links -- via `useEntrypoint()` |
| `postgres`   | Upstream, unmodified         | Event store, dedicated instance (not shared with other packages) |
| `redis`      | Upstream, unmodified         | Pub/sub, presence -- **persisted** (`--appendonly yes`), matching upstream's own reference deployment, not the generic "ephemeral cache" pattern |
| `minio`      | Upstream, unmodified         | S3-compatible object storage for git repos and media             |
| `minio-mc`   | Upstream, unmodified         | Used only by the one-shot bucket-creation daemon, never long-running |
| `caddy`      | Upstream, unmodified         | The single public entrypoint, via `useEntrypoint()` with a Caddyfile mounted from `assets/`. Caddy specifically because upstream's own `deploy/compose` reference uses it |

All images are multi-arch (`x86_64` + `aarch64`), confirmed via registry manifest inspection.

The `buzz-relay` image runs as a non-root `buzz` user (uid 1000) internally. A `chown-git` oneshot runs `chown -R 1000:1000` on the git data mount before the relay starts, since StartOS's volume storage doesn't otherwise match the image's expected ownership.

Subcontainers are named `postgres`, `redis`, `minio`, `minio-mc`, `buzz-relay`, `pairing-relay`, and `caddy`; `buzz-admin` is the short-lived subcontainer Manage Members runs in. Pass these to `start-cli package attach -n`.

## Volume and Data Layout

| Volume | Contains | Notes |
| ------ | -------- | ----- |
| `main` | `store.json` (secrets/config), Redis data (`redis/`), MinIO data (`minio/`), git repo data (`git/`) | |
| `db`   | PostgreSQL data directory | Dedicated volume, not shared with `main` -- required by `sdk.Backups.withPgDump()`, which mounts its `dbVolume` at the root with no subpath |

`store.json` is the package's only file model. It is seeded at install with internal secrets (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, MinIO keys, `BUZZ_RELAY_PRIVATE_KEY`, `BUZZ_GIT_HOOK_HMAC_SECRET`) and is otherwise written only by the actions: the owner's Nostr pubkey, the chosen relay address, the display names Manage Members keeps for each member, and `boundRelayUrl` -- the address the relay actually created its community under, written once by `main.ts` at first start and never rewritten. A hand edit survives until something rewrites that field, but editing `boundRelayUrl` by hand does not move the community; it only points the relay at a different one.

## Installation and First-Run Flow

This package skips Buzz's interactive setup entirely:

- Every internal secret (database/cache passwords, MinIO keys, the relay's signing key, the git-hook HMAC secret) is generated automatically at install -- nothing to configure.
- **A chain of critical tasks blocks first start**, following the `synapse-startos` pattern. Install raises **Set Relay Address/URL**; answering it raises **Set Relay Owner**. The service will not start until both are set. `set-relay-url` is `visibility: 'hidden'` and reachable only through its task, because the choice is permanent; **Set Relay Owner** is browsable and can be re-run at any time.
- The address is deliberately not auto-defaulted, and the picker offers domains only -- public or private. Upstream creates the relay's community under that address on first start and provides no way to move it, so the user has to add a domain to the interface before the task can be answered at all.
- Migrations run automatically on every start (`BUZZ_AUTO_MIGRATE=true`) -- the upstream image embeds them, but the flag itself defaults off in the raw binary and must be set explicitly.

## Configuration Management

| StartOS-Managed                                                                 | Upstream-Managed                        |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| All database/cache/storage credentials, the relay's signing key                  | Everything reachable through Buzz's own REST API and clients once running |
| `RELAY_OWNER_PUBKEY` (via the **Set Relay Owner** action)                        | Channel structure, membership beyond the owner, agent identities |
| `RELAY_URL` / `BUZZ_DOMAIN` / `BUZZ_CORS_ORIGINS` / `BUZZ_MEDIA_BASE_URL` (all derived from the address chosen via **Set Relay Address/URL** before first start, then frozen -- see Limitations) | |
| Membership mode: hardcoded closed (`BUZZ_REQUIRE_AUTH_TOKEN=true`, `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`) -- no open-registration option in this package | |

## Network Access and Interfaces

**One host, one binding, one interface.** Caddy owns the only bound port and fans
out to the two upstream processes, neither of which is reachable from outside the
container:

| Process | Internal port | Reachable at |
| ------- | ------------- | ------------ |
| `caddy` | 80 | The interface address -- the only port StartOS binds |
| `buzz-relay` | 3000, loopback | Everything except `/pair`: the WS relay, REST API, and the invite-link bundle |
| `buzz-pair-relay` | 5000, loopback | `/pair` only |

This is upstream's prescribed shape, not a packaging convenience.
`crates/buzz-pair-relay/src/lib.rs` states the sidecar "binds **loopback only**
and MUST run behind a reverse proxy" that "routes only `/pair` to this sidecar",
terminates TLS, and enforces HTTP read timeouts -- because the sidecar itself
runs with no auth, no persistence and no history, and "does not enforce path
restrictions or pre-upgrade connection limits". Caddy supplies the path
restriction and the `read_header` timeout; StartOS supplies TLS at the edge, so
`assets/Caddyfile` listens on plain HTTP with `auto_https off` and `admin off`.

The path matcher is `path /pair /pair/`, deliberately **not** a `/pair*` prefix:
a prefix would hand the unauthenticated sidecar every `/pair`-anything request.
Verified against the real Caddyfile with stub backends -- `/`, `/pairfoo` and
`/api/invites` reach the relay; only `/pair` and `/pair/` reach the sidecar.

`BUZZ_PAIRING_RELAY_URL` is therefore just the community's own URL with `/pair`
appended, derived in `main.ts` from `boundRelayUrl`. Nothing is stored and there
is no address to choose: the relay publishes it as `pairing_relay_url` in its
NIP-11 document, which is how a Buzz client discovers the sidecar.

**No action exposes that URL, deliberately** -- it is machine-to-machine only.
Buzz Desktop's Mobile Pairing settings card reads `pairing_relay_url` from
NIP-11, mints an ephemeral keypair and a single-use session secret, and renders a
`nostrpair://<source_pubkey>?secret=...&relay=...&v=1` QR that the phone's
pairing scanner reads (client sources live under upstream's `desktop/` and
`mobile/` trees). A human never reads, copies, or types the pairing URL, and
StartOS could not render that QR anyway: it holds the `relay=` field and nothing
else -- not the session secret, not the ephemeral key. An action showing the bare
address existed briefly and was removed; don't re-add one.

A single binding also sidesteps StartOS's public-domain isolation. A public
domain is scoped to the binding it was added to and auto-disabled on every
sibling binding (`start-core`, `net/host/address.rs` --
`reconcile_public_domain_on_sibling`: *"A public domain is scoped to its target
binding, so by default it is isolated here"*). With two bindings the domain
silently served one and not the other; with one there are no siblings.

**There is no browsable web UI, and `/` returning 404 is correct.** `router.rs`
binds `/` to `nip11_or_ws_handler` -- the Nostr endpoint, which answers a NIP-11
request (`Accept: application/nostr+json`) or a WebSocket upgrade and 404s
anything else. The static bundle at `/srv/buzz/web` is served only from an SPA
*fallback*, for invite-link paths and `/assets/`. Verified on a real box through
Caddy: `/` and `/index.html` 404 while `/invite/<token>` returns 200. That is why
the interface is `type: 'api'` with nothing to launch -- do not "fix" the 404, and
do not switch it to `type: 'ui'`. Upstream's `BUZZ_SERVE_GIT_WEB_GUI` flag (see
`TODO.md`) is the only thing that would put real pages on browsable paths.

StartOS's `schemeOverride` shows the interface as `ws://`/`wss://` in the
Interfaces tab rather than `http://`/`https://`, matching what Buzz Desktop and
other Nostr clients actually dial. StartOS serves the host over whatever gateways
the user enables -- LAN, Tor, a clearnet domain, Tailscale, or a
Cloudflare/StartTunnel tunnel -- with no special-casing per gateway.

The **relay** address cannot move once bound: upstream resolves a community from
the connection's host and stores it in a single `communities.host` column, so
only the address the community was created under reaches it. **Set Relay
Address/URL** is a pre-first-start choice and refuses to change afterward. See
Limitations.

## Actions (StartOS UI)

| Action | Purpose | Availability | Input | Output |
| ------ | ------- | ------------- | ----- | ------ |
| **Set Relay Owner** (`set-owner-pubkey`) | Set the Nostr identity that owns and administers this relay | Any status | `npub1...` or 64-char hex pubkey (explicitly rejects an `nsec1...` private key with a clear error) | -- |
| **Set Relay Address/URL** (`set-relay-url`) | Choose the permanent address the community is created under. Rejects any change once bound. `visibility: 'hidden'` -- not user-browsable, raised as a task | Only when stopped | Select from domains on the relay interface, public or private | -- |
| **Manage Members** (`manage-members`) | Add, remove, rename, and re-role everyone allowed on the relay, as one editable list | Only when running | A list of members: display name, `npub1...`/hex pubkey, role (member/admin) | -- |

Manage Members wraps `buzz-admin` (bundled in the same image) via `sdk.SubContainer.withTemp()`. It prefills from `buzz-admin list-members`, diffs the saved list against that roster, and issues one `add-member` / `remove-member` per change; `add-member` is `ON CONFLICT DO NOTHING` upstream, so a role change is a removal followed by an add. `buzz-admin` resolves which community it is acting on from `RELAY_URL`'s host, so the action operates on the community the relay bound at first start.

**Display names are the package's own.** `buzz-admin`'s roster has no name column -- only a 64-character hex pubkey -- so the names live in `store.json` and never reach the relay, its clients, or the kind:13534 membership event. The relay owner is never in the list: upstream refuses to remove it (`role <> 'owner'` in its own `DELETE`), so it is managed through **Set Relay Owner** instead.

**Set Relay Owner needs no status gate.** `ownerPubkey` sits in `main.ts`'s `.const()` store projection, so writing it invalidates that context and re-runs `setupMain`, rebuilding the daemon graph with the new `RELAY_OWNER_PUBKEY`. The restart is the SDK's reactive mechanism, not an explicit `effects.restart()` call. Only fields deliberately kept *out* of that projection -- `boundRelayUrl` -- can be written without bouncing the service.

Tasks chain rather than appearing together. `seedFiles` raises **Set Relay Address/URL** `critical` on install; its handler raises **Set Relay Owner** `critical` in turn. Each blocks the service from starting and clears when its value is set. Nothing re-raises them afterward, and the package never substitutes an address of its own choosing.

## Backups and Restore

- PostgreSQL: logical dump via `sdk.Backups.withPgDump()` -- portable across future image/Postgres version bumps, unlike a raw data-directory copy.
- The `main` volume (secrets, Redis data, MinIO data, git repo data): included via `addVolume`.
- Restore re-applies both together; no separate restore steps.

## Health Checks

Only **two** are shown to the user. The rest are liveness probes whose failure
already restarts the service, so surfacing them would add rows without adding
signal.

| Check | Method | Notes |
| ----- | ------ | ----- |
| `postgres` (internal) | `pg_isready` | Hand-rolled to return `loading` rather than `failure` while starting — a `failure` on a daemon `ready` restarts the whole service |
| `redis` (internal) | `redis-cli ping` | Same |
| `pairing-relay` (internal) | Port listening on the sidecar's loopback port | Liveness only. `checkPortListening` has no `loading` state and reports `failure` before the port is bound, so it carries a 30s `gracePeriod` |
| `caddy` (internal) | Port listening on Caddy's port | Same. Caddy takes about a second to adapt its config and listen; without the grace period the first poll lands in that gap and crash-loops the package |
| **Buzz Relay** | `GET /_readiness` on the relay's internal health port | 60s grace period — first boot runs migrations and the git object-store A3 conformance probe before the health port opens. Checks Postgres and Redis upstream, never S3 -- see next row |
| **Media & Git Storage** | `GET /minio/health/live` | The MinIO daemon's own readiness check, shown rather than hidden. It is the one sidecar worth surfacing because the relay's `/_readiness` does not cover S3, so a broken object store is otherwise invisible while every media upload and git push fails. This was previously a *second*, standalone check hitting the identical URL — one probe, not two |

## Dependencies

None. PostgreSQL, Redis, and MinIO are bundled as private sidecars dedicated to this package, not shared StartOS dependencies.

## Limitations and Differences

1. **One address, chosen before first start, permanent thereafter.** Upstream resolves a request's community from its connection host, stores that host in `communities.host` (`UNIQUE` on `lower(host)`, with no alias table), and creates a *new, empty* community for any host it has not seen. So a relay serves exactly one of the box's addresses no matter how many gateways StartOS exposes, and re-pointing it would leave the original members, channels and messages stranded under the old host with no upstream path to move them. This package binds the address at first start and refuses to change it; moving to a different address means reinstalling.

   **The picker offers domains only — public or private.** Buzz itself accepts any host; the narrowing is ours, on the same reasoning `synapse-startos` applies to its equally-permanent `server_name`. Because the binding cannot be revisited, the criterion is a stable identity: a domain is a name its owner controls and resolves on 443, while an mDNS name, a DHCP- or ISP-assigned IP, and StartOS's high external ports all move. The ports are the sharp edge — they are reassigned across reinstalls (observed on one box: `58891 → 58625 → 50306`), and a LAN or IP address carries one in its URL, so a restore onto a different box would strand the community permanently. A private domain is included deliberately: it suits an organisation on a LAN or VPN, where the operator can tell member devices to trust the box. It will **not** carry a publicly-trusted certificate — StartOS's ACME client answers the **TLS-ALPN-01** challenge (`async_acme`'s `acme-tls/1` ALPN path in `start-core`'s `net/acme.rs`; there is no DNS-01 or HTTP-01 route), which requires Let's Encrypt to reach the name itself on 443. A domain that resolves only inside the network cannot satisfy that, so it falls back to StartOS's own root CA, and every joining device has to trust that root.

2. **Closed relay only.** No open-registration mode -- membership is owner-invite-only. Upstream supports both.
3. **The relay's owner pubkey and address are chosen via StartOS actions**, not upstream's interactive setup wizard -- this package never runs it.

## What Is Unchanged from Upstream

Everything reachable through Buzz's own REST API, clients, and Nostr protocol behavior once the relay is running: channels, messages, git repo hosting, media handling, agent identities, invite links, and NIP compliance all work exactly as upstream Buzz documents.

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
  public: 80 (caddy; the only bound port)
  relay: 3000 (loopback)
  pairing: 5000 (loopback, served at /pair)
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
  - BUZZ_BIND_ADDR (127.0.0.1 — Caddy fronts it)
  - BUZZ_PAIR_RELAY_BIND_ADDR (127.0.0.1 — never public)
actions:
  - set-owner-pubkey
  - set-relay-url
  - manage-members
```
