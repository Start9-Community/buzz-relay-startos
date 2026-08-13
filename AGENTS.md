# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for
[Buzz](https://github.com/block/buzz), packaged as a closed, single-owner
relay. `README.md` has the full architecture writeup; this file is the
operating notes a fresh session needs before touching code.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## Architecture, in one paragraph

`startos/main.ts` wires: `postgres` (own volume `db`), `redis` (persisted,
not ephemeral -- see gotcha below), `minio` + a `minio-init` oneshot
(bucket creation), a `chown-git` oneshot (fixes `buzz-relay`'s non-root
git-volume permissions -- see gotcha below), `pairing-relay`
(`buzz-pair-relay`, a third binary in the same image, for NIP-AB mobile
QR pairing on port 5000), and `buzz-relay` itself (gated on all of the
above via `requires`). Actions collect the things that can't be
auto-generated or need to change live: `setOwnerPubkey` (owner identity,
only-stopped), `setRelayUrl`/`setPairingUrl` (which reachable address
Buzz Desktop / the mobile app should use, any status, auto-defaulted to
LAN `.local` on install), and `addMember`/`removeMember`/`listMembers`
(wrap the bundled `buzz-admin` CLI via `buzzAdmin.ts`, only-running).
Everything else (DB/cache/storage passwords, the relay's signing key) is
generated once at install (`init/seedFiles.ts`) into `store.json`.

## Gotchas that cost real debugging time — don't re-derive these

- **Redis is persisted, not ephemeral.** The generic "Redis/Valkey Cache" SDK recipe says to run it with no volume and `--save '' --appendonly no`. Buzz's own reference `deploy/compose/compose.yml` does the opposite (`--appendonly yes` + a named volume) — pub/sub and presence state are expected to survive a restart. Mirrored here (`main.ts`, the `redis` daemon). Don't "simplify" this back to the generic pattern.
- **`buzz-relay` needs its git volume owned by uid 1000, and `idmap` does NOT achieve this in practice.** The image runs as a non-root `buzz` user (uid 1000, gid 1000 — see its Dockerfile) and expects to own `/data/git`. The obvious fix, `idmap: [{fromId: 0, toId: 1000}]` on the mount, is what the SDK docs describe for exactly this problem — **tested on a real box, did not work, identical crash both before and after.** The fix that actually works is the `chown-git` oneshot in `main.ts` (`chown -R 1000:1000 /data/git`, run as root, gated in front of the `buzz-relay` daemon) — the same pattern `ghost-startos`/`nextcloud-startos` use. If this ever regresses, don't reach for `idmap` again without a real install to test against.
- **`BUZZ_AUTO_MIGRATE` defaults to off in the raw binary**, even though the Helm chart's own default is `true`. Migrations are embedded in the binary (`sqlx::migrate!`), so no separate migrate oneshot is needed — just the explicit `BUZZ_AUTO_MIGRATE: 'true'` env var already set in `main.ts`. Don't remove it thinking the image handles this itself.
- **`/_readiness` only checks Postgres/Redis, never S3.** This is why the standalone `media-storage` health check exists (hits MinIO's own `/minio/health/live` directly) — without it, a broken object-storage connection is invisible even though it breaks every media upload and git push.
- **Nostr pubkeys are npub (bech32) in the wild, never raw hex.** `startos/nostr.ts` is a small self-contained NIP-19 bech32 decoder (no dependency) — reuse it for any future field that collects a pubkey. `setOwnerPubkey.ts` accepts `npub1...` (decoded to hex), explicitly rejects `nsec1...` with a clear error (a real user pasted their private key's hex by mistake — both are 64 hex chars, indistinguishable by format alone), and still accepts raw hex for anyone who already has it. Don't add a new pubkey-collecting field that's hex-only.
- **Every image except `buzz-relay` self-heals its own ownership.** Postgres's entrypoint chowns `PGDATA` itself at startup; redis/minio run as root. The `chown-git` oneshot is only needed for `buzz-relay`'s non-root, non-self-healing image — don't add it defensively to the others.
- **`relayUrl`/`pairingUrl` changes via their actions don't take effect until `main.ts` re-runs.** Both are baked into daemon env once, at the top of `setupMain`, via `storeJson.read().const(effects)` — `.const()` (despite the name) is the *reactive* read; it reruns the calling context when the value changes, so a store write does eventually restart the daemon graph with the new env. But there is no visible "restarting..." feedback in the Actions UI, so **a real real-hardware pairing failure and "the user just hadn't run the action yet" look identical from a support screenshot alone** — confirm the relevant `set-*-url` action was actually run before treating a repeat of the same cert/connection error as a new bug.
- **Mobile pairing's LAN `.local` default doesn't work with Buzz Desktop's pairing client.** Its Rust TLS stack doesn't trust this box's self-signed local certificate the way a browser that's installed the StartOS root CA does (`WebSocket connection failed: IO error: invalid peer certificate: UnknownIssuer`). Point `setPairingUrl` at a Tor/clearnet/tunnel address instead — this is expected, not a bug, until/unless upstream's pairing client learns to trust StartOS's local CA.

## Versioning

Each shipped change bumps `startos/versions/current.ts`'s `version`
(`<semver>:<revision>` -- StartOS's own ExVer format). **Bump `current.ts`
in place; don't spin off a historical version file unless the bump
genuinely needs a migration.** `other: []` already covers every prior
revision via `VersionGraph`'s synthesized range vertex -- a historical
file only earns its place when its *own* migration must run in sequence
on the way up (see `../start-technologies/projects/start-sdk/docs/src/versions.md`
"When to Create a New Version File" -- read it before touching
`versions/`, this has already been gotten wrong once in this repo).
Bump the revision (`:N`) for ordinary releases; bump the semver itself for
a real milestone (e.g. pairing/member-management moving from "shipped but
unverified" to confirmed-working, or a scope change like adding
open-registration). Write real release notes in all 5 locales -- they're
what a StartOS user sees in the update dialog, not an internal changelog.
Migrations (`up`/`down`) are for `store.json`/volume-layout changes only;
most releases' migrations are no-ops (`async () => {}`), not `IMPOSSIBLE`
-- reserve `IMPOSSIBLE` for genuinely irreversible/non-reconstructible
changes. Tag each release `v<upstream>_<revision>` (e.g. `v1.0.0_1`),
pushed individually (`git push origin <tag>`), matching the version
string with `:` replaced by `_` -- no package-name prefix.

## Inspecting a running install

To run a command inside a service's container (read its generated config, grep app logs), use `start-cli package attach <id> -n <subcontainer-name> -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts`, e.g. `-n web`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers". A service with more than one subcontainer requires a selector; with none given, `attach` falls back to an interactive picker that panics in a non-TTY shell — that's the missing selector, not a TTY requirement.
