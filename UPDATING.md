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

The current pin is the `dockerTag` of the `buzz-relay` image in
`startos/manifest/index.ts`.

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

1. `startos/manifest/index.ts` — set the `buzz-relay` image's `dockerTag` to
   `ghcr.io/block/buzz:sha-<short>`. Leave the other four images alone; they
   track their own upstreams.
2. `startos/versions/current.ts` — set `version` to `<crate version>:0`, or bump
   the revision instead if the crate version has not moved since the last
   release. Write release notes in all five locales.
3. Re-read the relay's env surface for anything added, removed, or renamed:
   `crates/buzz-relay/src/config.rs` against the env block in `startos/main.ts`.
   A silently-dropped variable will not fail the build.
4. Re-read `crates/buzz-admin/src/main.rs` if the member actions misbehave — the
   `list-members` table format is parsed by `parseMembers` in
   `startos/buzzAdmin.ts`, and a column change there breaks parsing silently.
5. Install on a real box and exercise it (see `AGENTS.md`). A version bump is not
   done until the relay reaches healthy and the member actions round-trip.

## What must not change in a bump

The relay creates its community under `RELAY_URL`'s host and cannot move it, so
an upgrade must keep serving the host recorded in `store.json`'s
`boundRelayUrl`. Never repoint that field as part of a version bump, and never
reintroduce a code path that rewrites it — see `AGENTS.md` § This repo.
