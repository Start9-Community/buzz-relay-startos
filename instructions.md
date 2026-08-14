# Buzz Relay

## Documentation

- [Buzz on GitHub](https://github.com/block/buzz) -- the upstream project, its architecture docs, and vision documents.
- [buzz.xyz](https://buzz.xyz) -- download Buzz Desktop and the mobile app.

## What you get on StartOS

A closed, single-owner Buzz relay, reached at a single address. PostgreSQL, Redis, and object storage for git repos and media run alongside it as private sidecars, with nothing to configure on your end: every credential is generated automatically.

You need a domain pointed at this server to run Buzz. Your community lives at one address forever, so it has to be a name you control — a public domain if people will join from anywhere, or a private domain if this is for an organisation on its own network or VPN. Your server's local address and its IP addresses are not offered: they can change, which would strand your community for good.

The relay won't start until you have worked through the tasks StartOS raises, in order.

1. **Add your domain to the Buzz Relay interface**, under the **Interfaces** tab. For a public domain, choose **Let's Encrypt** as the certificate provider — then every device trusts it with nothing to install. A private domain can only be signed by your server's own root certificate, which is fine on a private network, but each device that joins has to be told to trust that root first. Do this first; the next task has nothing to offer you until it's done.
2. **Set Relay Address/URL** — pick your domain. **This is permanent.** Buzz creates your community under this exact address the first time the relay starts, and nothing can move it afterward; changing your mind later means starting over from an empty community.
3. **Set Relay Owner** — paste your `npub1...` address (or its 64-character hex equivalent). This is the identity that administers the relay.
4. The relay starts, and is ready once its health checks turn green.
5. Open Buzz Desktop, choose **Join a Community**, and enter your domain.

## Using Buzz Relay

### There is no web page to open

Your relay's address is for Buzz clients, not for a browser -- opening it directly gives you a "404 Not Found", which is normal and not a sign anything is wrong. Everything you do day to day happens in Buzz Desktop or the mobile app. The one exception is an invite link: those open in a browser and show a real page.

### Adding your phone

There is nothing to set up on StartOS for this, and no second address to hand out.

1. In **Buzz Desktop**, open **Settings → Mobile Pairing**. It shows a QR code.
2. Open Buzz on your phone and scan it.

Your two devices do the rest between themselves. The QR carries a one-time secret generated fresh for each attempt, so it is worth exactly one pairing -- treat it as private, and don't photograph or forward it. Your relay's only part is telling Buzz where the two devices should talk, which it advertises automatically at the `/pair` path on your own address, covered by the same certificate as everything else.

### Actions

- **Set Relay Owner** -- change the relay's owner identity. You can do this at any time; if the relay is running it restarts itself so the change takes effect.
- **Manage Members** -- your whole member list in one place: a name you choose, that person's `npub` (or hex pubkey), and their role. Add an entry to let someone in, delete one to revoke their access, edit a name or role in place -- nothing takes effect until you save. The name is stored on your server and never shown to Buzz or to anyone else; it is there so you don't have to tell people apart by a 64-character key. You are always a member as the owner, so you won't appear in the list -- change that identity with **Set Relay Owner**. Available while the relay is running.

**Set Relay Address/URL** is not in this list on purpose: it appears only as a setup task, because the address it picks is permanent.

## Limitations

- Your community lives at exactly one address, fixed when the relay first starts. Even if this server is reachable several ways, only that one address will find your community — the others will not.
- Closed relay only -- membership is owner-invite-only, with no open-registration mode.
