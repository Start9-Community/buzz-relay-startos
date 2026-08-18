# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **Caddy is the only bound port, and `buzz-pair-relay` must stay on loopback.** `assets/Caddyfile` routes `/pair` and `/pair/` to the pairing sidecar on `127.0.0.1:5000` and everything else to the relay on `127.0.0.1:3000`; StartOS binds Caddy alone. Both `BUZZ_BIND_ADDR` and `BUZZ_PAIR_RELAY_BIND_ADDR` are loopback and must stay that way. This is upstream's requirement, not our preference: `crates/buzz-pair-relay/src/lib.rs` says the sidecar "binds **loopback only** and MUST run behind a reverse proxy" that routes only `/pair`, terminates TLS, and enforces read timeouts, because it runs with no auth or persistence and "does not enforce path restrictions or pre-upgrade connection limits" itself. An earlier revision bound it `0.0.0.0:5000` on its own public interface — never do that again. Keep the matcher exact (`path /pair /pair/`); `/pair*` would hand the sidecar every `/pair`-anything request. StartOS terminates TLS, so the Caddyfile stays plain HTTP with `auto_https off` and `admin off`, and `caddy fmt`/`caddy validate` it after any edit — a bad Caddyfile fails at daemon start, not at build.
- **One binding is also what keeps a public domain working.** StartOS scopes a public domain to the binding it was added to and auto-disables it on every sibling (`start-core`, `net/host/address.rs` → `reconcile_public_domain_on_sibling`), so a second binding silently loses the domain. Don't add one; put new endpoints behind Caddy as paths.
- **`buzz-relay` needs `/data/git` owned by uid 1000, and `idmap` does not achieve it.** The image runs as non-root `buzz` (uid/gid 1000). `idmap: [{fromId: 0, toId: 1000}]` on the mount is what the SDK docs prescribe for this and was **tested on a real box with an identical crash before and after**. The working fix is the `chown-git` oneshot (`chown -R 1000:1000 /data/git`, as root, gated ahead of the relay), matching `ghost-startos`/`nextcloud-startos`. Don't reach for `idmap` again without a real install to test against. Every other image self-heals its own ownership — don't add the oneshot defensively elsewhere.
- **Redis is persisted, not ephemeral.** The generic Redis/Valkey cache recipe runs it volumeless with `--appendonly no`; Buzz's own `deploy/compose/compose.yml` does the opposite, because pub/sub and presence state are expected to survive a restart. Don't "simplify" it back.
- **`/_readiness` checks Postgres and Redis only, never S3.** That is why the MinIO daemon's own readiness check is the one sidecar with a `display` — without it a broken object-storage connection is invisible while every media upload and git push fails. Don't add a second check for it: a standalone one hitting the identical URL used to exist alongside it.
- **There is no browsable web UI; `/` returning 404 is upstream's routing, not a bug.** `router.rs` binds `/` to `nip11_or_ws_handler`, which serves NIP-11 or a WebSocket upgrade and 404s a plain browser GET. The `/srv/buzz/web` bundle is an SPA _fallback_ for invite-link paths and `/assets/` only — `/invite/<token>` returns 200. Keep the interface `type: 'api'`; don't chase the 404 or add a launch target.
- **Everything shared lives under `startos/utils/`, reached through the `utils` barrel** — `constants.ts` (ports, database and bucket names), `buzzAdmin.ts` (the admin-CLI exec and its `list-members` parser), `nostr.ts`, and `pubkey.ts`. Import from `'../utils'`, never from a file inside it; only its own siblings do that, and only to avoid importing the barrel from within itself.
- **`utils/nostr.ts` is the package's NIP-19 decoder; `utils/pubkey.ts` is the action boundary over it.** `nostr.ts`'s errors are library diagnostics ("invalid bech32 checksum"), so any action taking a pubkey goes through `toHexPubkey`, which raises translated copy instead — except the nsec rejection, whose wording names whose key it is and so stays with each caller. `buzz-admin` parses npub and hex equally well, but `manage-members` still normalizes: it diffs against `list-members`, which reports hex, and keys its display names the same way.
