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

Work this package's `TODO.md` from top to bottom. Keep `README.md` (the package's technical reference — the only one an AI support or administering agent reads) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **The relay's address is bound once and is not changeable.** Upstream keys a community by `RELAY_URL`'s authority (`communities.host`, `UNIQUE` on `lower(host)`, no alias table), and `ensure_configured_community` creates a *new, empty* community for any host it hasn't seen — so re-pointing a running relay strands the original members, channels and messages. `main.ts` binds `boundRelayUrl` on first start and derives every host-dependent env var from it; `setRelayUrl` refuses a change afterward and `watchRelayUrl` reports a missing bound address rather than substituting one. Never "restore" the convenience of a freely-changeable URL. The same constraint means only **one** of the box's addresses ever reaches the community — this is upstream's design, not a packaging limitation.
- **`buzz-relay` needs `/data/git` owned by uid 1000, and `idmap` does not achieve it.** The image runs as non-root `buzz` (uid/gid 1000). `idmap: [{fromId: 0, toId: 1000}]` on the mount is what the SDK docs prescribe for this and was **tested on a real box with an identical crash before and after**. The working fix is the `chown-git` oneshot (`chown -R 1000:1000 /data/git`, as root, gated ahead of the relay), matching `ghost-startos`/`nextcloud-startos`. Don't reach for `idmap` again without a real install to test against. Every other image self-heals its own ownership — don't add the oneshot defensively elsewhere.
- **Redis is persisted, not ephemeral.** The generic Redis/Valkey cache recipe runs it volumeless with `--appendonly no`; Buzz's own `deploy/compose/compose.yml` does the opposite, because pub/sub and presence state are expected to survive a restart. Don't "simplify" it back.
- **`BUZZ_AUTO_MIGRATE` defaults off in the raw binary** even though the Helm chart defaults it on. Migrations are embedded via `sqlx::migrate!`, so the explicit env var in `main.ts` replaces a migrate oneshot — don't remove it thinking the image handles it.
- **`/_readiness` checks Postgres and Redis only, never S3.** That is why the standalone `media-storage` health check exists; without it a broken object-storage connection is invisible while every media upload and git push fails.
- **`nostr.ts` is the package's NIP-19 decoder** — reuse it for any new field that accepts a pubkey. Its errors are library diagnostics; translate at the action boundary (see `setOwnerPubkey.ts`). Note `buzz-admin` does its own npub/hex parsing, so member actions pass user input straight through.

## Inspecting a running install

`start-cli package attach buzz-relay -n <subcontainer-name> -- <cmd>` — select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts`). `-s` matches the internal Guid, not the name.
