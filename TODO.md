# TODO — Buzz Relay

Core packaging, mobile QR pairing, and member management are all done and
**confirmed working end-to-end on a real StartOS box** as of `v1.0.0:1`
(2026-08-12): the relay starts, reaches healthy, a real Buzz Desktop client
connects and pairs with a mobile device, and Add/Remove/List Member all work
against the live relay. What's left is polish and a couple of upstream-driven
follow-ups.

## In progress

- [ ] Nothing currently in progress.

## Worth considering

- [ ] **Drop the persistent `/data/git` volume and the `chown-git` oneshot
      entirely.** Checking upstream's latest source (2026-08-12) after a
      Buzz update: `crates/buzz-relay/src/config.rs` now describes
      `BUZZ_GIT_REPO_PATH`/`BUZZ_GIT_PACK_CACHE_PATH` as pure ephemeral
      scratch space — "no per-repo bare repos or persistent git state live
      here... needs no ReadWriteMany volume." Real git durability now lives
      in Postgres (`git_repo_names`) + S3/MinIO. If that holds, `buzz-relay`
      could just use its own container-local default path (already
      `buzz:buzz`-owned by the Dockerfile, nothing overmounts it), which
      would eliminate the whole `chown-git` workaround and its dedicated
      volume/subpath. Not done yet — this changes the exact piece that took
      real-hardware debugging to get right, so it deserves its own dedicated
      test cycle, not a change bundled into an unrelated release.
- [ ] Optionally expose `BUZZ_SERVE_GIT_WEB_GUI=true` to turn on upstream's
      bundled Git repository browser at `/` (separate from the invite
      landing page, which is already on by default). Not required for
      anything we currently document — purely a nice-to-have if wanted.

## Deferred, not urgent

- [ ] `UPDATING.md` — document how to check for a new upstream image tag/version
      once one exists (`ghcr.io/block/buzz` has no tagged release yet, only
      `:main`).
- [ ] Consider exposing `buzz-admin migrate` as an optional repair action
      (not needed for normal operation — migrations already run automatically
      on every start).
- [ ] Revisit whether MinIO can be swapped for a lighter S3-compatible server
      (SeaweedFS, Garage) — deferred in the Phase 0 spike pending confirmation
      that the alternative correctly returns HTTP 412 on conditional-write
      conflicts, which Buzz's git object store relies on.
- [ ] The GitHub Actions "Tag and Release" workflow fails on every push (no
      registry vars/secrets configured) — known, harmless, intentionally left
      as-is since we sideload directly rather than publish to a registry.
      Revisit only if that distribution model changes.
