# Buzz Relay

## Documentation

- [Buzz on GitHub](https://github.com/block/buzz) -- the upstream project, its architecture docs, and vision documents.
- [buzz.xyz](https://buzz.xyz) -- download Buzz Desktop and the mobile app.

## What you get on StartOS

A closed, single-owner Buzz relay -- the WebSocket relay, REST API, and a small bundled web UI, all on one interface. PostgreSQL, Redis, and object storage for git repos and media run alongside it as private sidecars, with nothing to configure on your end: every credential is generated automatically.

You need a domain of your own to run Buzz. Buzz's apps trust only the standard public certificate authorities, so a Tor address or your server's local `.local` address cannot be used — a certificate you install on your own devices makes no difference to them.

The relay won't start until you have worked through the tasks StartOS raises, in order.

1. **Add your domain to the Buzz Relay interface**, under the **Interfaces** tab, choosing **Let's Encrypt** as the certificate provider. Do this first — the next task has nothing to offer you until it's done.
2. **Set Relay Address/URL** — pick your domain. **This is permanent.** Buzz creates your community under this exact address the first time the relay starts, and nothing can move it afterward; changing your mind later means starting over from an empty community.
3. **Set Relay Owner** — paste your `npub1...` address (or its 64-character hex equivalent). This is the identity that administers the relay.
4. The relay starts, and is ready once its health checks turn green.
5. Open Buzz Desktop, choose **Join a Community**, and enter your domain.

## Using Buzz Relay

### Web interface

The relay's own address also serves a small bundled web UI (mainly used for invite-link landing pages). Most day-to-day use happens through the Buzz Desktop or mobile apps, not this page directly.

### Mobile pairing

Scanning a QR code from the Buzz mobile app to pair a phone uses a separate address, shown as **Mobile Pairing** on the **Interfaces** tab. It defaults to your LAN address automatically. **If pairing fails with a certificate error** (the mobile app doesn't trust this box's local certificate), use the **Set Pairing Address/URL** action to point it at a Tor, clearnet, or tunnel address instead.

### Actions

- **Connection Information** -- shows your community address, as text and as a QR code, alongside your owner key. This is what to hand anyone joining.
- **Set Relay Owner** -- change the relay's owner identity.
- **Set Relay Address/URL** -- pick the address Buzz Desktop and invite links use. Only settable before the relay first starts; afterward it will refuse to change.
- **Set Pairing Address/URL** -- pick which address the mobile app should use when scanning a QR code to pair. Change this anytime.
- **Add Member** -- register another person's Nostr identity (paste their `npub` or hex pubkey) and choose their role.
- **Remove Member** -- pick a current member from the list and remove them.
- **List Members** -- see everyone currently registered and their role.

## Limitations

- Your community lives at exactly one address, fixed when the relay first starts. Even if this server is reachable several ways, only that one address will find your community — the others will not.
- Closed relay only -- membership is owner-invite-only, with no open-registration mode.
