# Buzz Relay

## Documentation

- [Buzz on GitHub](https://github.com/block/buzz) -- the upstream project, its architecture docs, and vision documents.
- [buzz.xyz](https://buzz.xyz) -- download Buzz Desktop and the mobile app.

## What you get on StartOS

A closed, single-owner Buzz relay -- the WebSocket relay, REST API, and a small bundled web UI, all on one interface. PostgreSQL, Redis, and object storage for git repos and media run alongside it as private sidecars, with nothing to configure on your end: every credential is generated automatically.

## Getting set up

1. Right after install, you'll see a critical task asking for the relay owner's Nostr public key. Paste your `npub1...` address (or its 64-character hex equivalent) and confirm -- the relay won't start until this is set.
2. The relay's address defaults automatically to your LAN address. If you'd rather use a Tor, clearnet, Tailscale, or tunnel address instead, enable that gateway under the **Interfaces** tab first, then run the **Set Relay Address/URL** action to pick it.
3. Once both are set, the relay starts. You'll get a notification with the connection address and your owner pubkey once it's ready.
4. Open Buzz Desktop, choose **Join a Community**, and paste the address from that notification (or from the **Interfaces** tab).

## Using Buzz Relay

### Web interface

The relay's own address also serves a small bundled web UI (mainly used for invite-link landing pages). Most day-to-day use happens through the Buzz Desktop or mobile apps, not this page directly.

### Mobile pairing

Scanning a QR code from the Buzz mobile app to pair a phone uses a separate address, shown as **Mobile Pairing** on the **Interfaces** tab. It defaults to your LAN address automatically -- no action needed unless you want it reachable somewhere else.

### Actions

- **Set Relay Owner** -- change the relay's owner identity. Only available while the service is stopped.
- **Set Relay Address/URL** -- pick which currently-reachable address (LAN, Tor, a domain, a tunnel) Buzz Desktop and invite links should use. Available anytime.
- **Add Member** -- register another person's Nostr identity (paste their `npub` or hex pubkey) and choose their role.
- **Remove Member** -- pick a current member from the list and remove them.
- **List Members** -- see everyone currently registered and their role.

## Limitations

- Mobile pairing and the member-management actions above are new and haven't been confirmed working on a real install yet -- if either doesn't behave as described, that's the current known risk area.
