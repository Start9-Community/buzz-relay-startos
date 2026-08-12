import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { POSTGRES_DB, POSTGRES_USER } from './utils'

// Shared by the member-management actions (add/remove/list) to exec
// buzz-admin -- the CLI bundled in the same image as buzz-relay -- in a
// short-lived container, per recipe-reset-password.md's documented pattern
// for admin-CLI actions (SubContainer.withTemp, not attaching to the live
// daemon's own subcontainer).
//
// Env requirements read directly from buzz-admin's own source
// (crates/buzz-admin/src/main.rs):
// - Every command needs DATABASE_URL and RELAY_URL (tenant resolution keys
//   off RELAY_URL's host -- must match the running relay's exact value).
// - add-member/remove-member additionally need BUZZ_RELAY_PRIVATE_KEY (to
//   sign the updated kind:13534 membership roster) and REDIS_URL (to push
//   it to live clients). list-members needs neither.
export async function execBuzzAdmin(effects: T.Effects, args: string[], opts: { write: boolean }): Promise<string> {
  const store = await storeJson.read().once()
  const pgPassword = store?.pgPassword ?? ''
  const relayUrl = store?.relayUrl ?? ''

  const env: Record<string, string> = {
    DATABASE_URL: `postgres://${POSTGRES_USER}:${pgPassword}@127.0.0.1:5432/${POSTGRES_DB}`,
    RELAY_URL: relayUrl,
  }
  if (opts.write) {
    env.BUZZ_RELAY_PRIVATE_KEY = store?.relayPrivateKey ?? ''
    env.REDIS_URL = `redis://:${store?.redisPassword ?? ''}@127.0.0.1:6379`
  }

  let output = ''
  await sdk.SubContainer.withTemp(effects, { imageId: 'buzz-relay' }, sdk.Mounts.of(), 'buzz-admin', async sub => {
    const result = await sub.execFail(['/usr/local/bin/buzz-admin', ...args], { env })
    output = result.stdout.toString()
  })
  return output
}

// Parses buzz-admin list-members' fixed-width text table into structured
// rows. Format (see cmd_list_members in buzz-admin's source):
//   "(no relay members)"                                    -- when empty
// or:
//   pubkey<pad>  role<pad>  added_by<pad>  created_at
//   ------------------------------------------------------
//   <64-hex>      member    -                2026-...Z
// Splitting each data row on whitespace is enough -- hex pubkeys and role
// names never contain spaces, and we don't need added_by/created_at here.
export function parseMembers(output: string): { pubkey: string; role: string }[] {
  const lines = output.trim().split('\n')
  if (lines.length === 0 || lines[0] === '(no relay members)') return []
  // Skip the header row and the "---" separator row.
  return lines.slice(2).map(line => {
    const [pubkey, role] = line.trim().split(/\s+/)
    return { pubkey, role }
  })
}
