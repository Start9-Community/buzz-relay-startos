# TODO — Buzz Relay

## Worth considering

- [ ] **Drop the persistent `git/` subpath and the `chown-git` oneshot.**
      Upstream documents `BUZZ_GIT_REPO_PATH` as pure scratch — verified at the
      pinned commit in `crates/buzz-relay/src/config.rs`: "No authoritative
      repository state lives here … this directory need not be persistent or
      shared across replicas." Repo-name uniqueness lives in Postgres
      (`git_repo_names`) and object state in MinIO. If that holds, the relay can
      use its container-local default path — already `buzz:buzz`-owned by the
      image's own Dockerfile, with nothing overmounting it — which removes the
      mount, the oneshot, and a chunk of pointless backup weight. Deliberately
      not bundled into the community-registry intake: it changes the one piece
      that took real-hardware debugging to get right, so it wants its own test
      cycle.
- [ ] Optionally expose `BUZZ_SERVE_GIT_WEB_GUI=true` to turn on upstream's
      bundled Git repository browser at `/` (separate from the invite landing
      page, which is already on by default). Not required for anything we
      currently document — purely a nice-to-have if wanted.

## Deferred, not urgent

- [ ] Consider exposing `buzz-admin migrate` as an optional repair action (not
      needed for normal operation — migrations already run automatically on
      every start).
- [ ] Revisit whether MinIO can be swapped for a lighter S3-compatible server
      (SeaweedFS, Garage) — deferred pending confirmation that the alternative
      correctly returns HTTP 412 on conditional-write conflicts, which Buzz's
      git object store relies on.
- [ ] Watch for upstream growing a way to move or alias a community's host. The
      whole bind-once design (`boundRelayUrl`, the permanent
      **Set Relay Address/URL**) exists only because `communities.host` is
      single-valued and unique. If upstream adds an alias table or a rename
      path, this package should relax accordingly.
