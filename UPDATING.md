# Updating the upstream version

Upstream is the prebuilt image `ghcr.io/block/buzz`, built from the `block/buzz`
monorepo. There is no released semver image tag: the registry carries only
`:main`, which floats, and a per-commit `sha-<short>` tag. This package pins a
`sha-<short>` so an install can never pull an image it has not been tested
against, which means a bump is a deliberate act, not something `npm update` or a
floating tag does for you.

Because the image tag carries no version, the manifest's version comes from the
`buzz-relay` **crate** version at the pinned commit. The two are tracked
separately and both have to move.

## Determining the upstream version

The current pin is the `IMAGE` build arg of the `buzz-relay` image in
`startos/manifest/index.ts`, which the root `Dockerfile` builds on.

Pick the commit you intend to ship — usually the newest one on `main` that has a
published image — and read the crate version at that commit:

```bash
COMMIT=<full-or-short-sha>
curl -sL "https://raw.githubusercontent.com/block/buzz/$COMMIT/crates/buzz-relay/Cargo.toml" | grep -m1 '^version'
```

Confirm the image for that commit actually exists and is multi-arch before
pinning it:

```bash
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:block/buzz:pull&service=ghcr.io" | jq -r .token)
curl -sI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://ghcr.io/v2/block/buzz/manifests/sha-${COMMIT:0:7}"
```

## Applying the bump

1. `startos/manifest/index.ts` — set the `buzz-relay` image's `IMAGE` build
   arg to `ghcr.io/block/buzz:sha-<short>`. Leave the other five images alone;
   they track their own upstreams.
2. `startos/versions/current.ts` — set `version` to `<crate version>:0`, or bump
   the revision instead if the crate version has not moved since the last
   release.
3. Re-read the relay's env surface for anything added, removed, or renamed:
   `crates/buzz-relay/src/config.rs` against the env block in `startos/main.ts`.
   A silently-dropped variable will not fail the build.
4. Re-read `crates/buzz-pair-relay/src/lib.rs`'s "Deployment" section. It is the
   contract `assets/Caddyfile` implements — the sidecar stays on loopback, only
   `/pair` reaches it, and the proxy enforces the read timeout. If upstream
   changes the path or those responsibilities, the Caddyfile changes with it.
5. Re-read `crates/buzz-admin/src/main.rs` if Manage Members misbehaves — the
   `list-members` table format is parsed by `parseMembers` in
   `startos/utils/buzzAdmin.ts`, and a column change there breaks parsing
   silently.
   The action also assumes the owner appears as a `list-members` row it must
   never offer, and that a role change needs a `remove-member` before the
   `add-member` (upstream inserts `ON CONFLICT … DO NOTHING`).

## Schema migrations that stop startup

With `BUZZ_AUTO_MIGRATE=true` the relay applies every new file in `migrations/`
at startup, and some refuse to run against existing data — the relay then
crash-loops. Diff the two commits' `migrations/` listings (the contents API at
each ref; GitHub's compare truncates its file list on a large range) and read
every new file for a `RAISE EXCEPTION`. A fresh install never exercises these.

Past `sha-9e8c9fc`, each of these needs package-side work before the pin can move:

- `0076`, `0078`, `0081` refuse a non-empty table whose new index was not
  prebuilt. `0078` covers `channel_members`, so every relay in use hits it.
  Build each index with `CREATE INDEX CONCURRENTLY` first, as upstream's
  `docs/artifact-sync-deployment.md` and `docs/profile-search.md` describe.
- `0083` refuses duplicate case-insensitive listed channel names, which
  `sha-9e8c9fc` permits. It needs upstream's staged upgrade in
  `docs/channel-name-uniqueness-deployment.md`: ship a release containing #8782
  first, rename duplicates through the relay, confirm none remain.

## What must not change in a bump

The relay creates its community under `RELAY_URL`'s host and cannot move it, so
an upgrade must keep serving the host recorded in `store.json`'s
`boundRelayUrl`. Never repoint that field as part of a version bump, and never
reintroduce a code path that rewrites it — see `AGENTS.md` § This repo.
