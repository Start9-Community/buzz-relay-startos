# TODO — Buzz Relay

Core packaging is done and verified on a real StartOS box: the relay starts,
reaches healthy, and a real Buzz Desktop client connects through it. What's
left is feature-complete parity with Exergy's own production deployment
(see the "Buzz Relay — Infrastructure & Configuration" doc) and general polish.

## In progress

- [ ] **Mobile pairing.** Upstream ships a separate `buzz-pair-relay` sidecar
      (a third binary in the same image) for QR-code mobile pairing — this
      package doesn't run it yet, so pairing 404s. Needs: a `pairing-relay`
      daemon (`buzz-relay` image, entrypoint override), a second bound
      interface, and `BUZZ_PAIRING_RELAY_URL` wired onto the main relay
      daemon.
- [ ] **Member management.** `buzz-admin add-member`/`remove-member`/`list-members`
      (bundled in the same image) aren't exposed as StartOS actions yet —
      adding/removing anyone beyond the owner currently requires Buzz
      Desktop's own admin flows. Add three actions using
      `sdk.SubContainer.withTemp()` (see `recipe-reset-password.md`'s
      documented pattern for admin-CLI actions); reuse `nostr.ts` for
      pubkey validation.

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
