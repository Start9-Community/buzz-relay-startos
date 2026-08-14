import { i18n } from '../i18n'
import { decodeBech32 } from './nostr'

/**
 * Normalizes an npub or hex public key to 64-character hex. Callers reject an
 * nsec first: that message names whose key it is, so it differs per action.
 */
export function toHexPubkey(raw: string): string {
  const lower = raw.trim().toLowerCase()
  if (!lower.startsWith('npub1')) return lower

  // decodeBech32's own errors are library diagnostics ("invalid bech32
  // checksum"); a mistyped npub clears the input pattern and lands here, so
  // translate at the boundary rather than leaking them into the alert.
  const decoded = (() => {
    try {
      return decodeBech32(lower)
    } catch {
      throw new Error(
        i18n(
          'That npub is not valid — check it for typos. Every character matters, and the key carries its own checksum, so a single wrong character makes the whole key unreadable.',
        ),
      )
    }
  })()

  if (decoded.prefix !== 'npub') {
    throw new Error(
      i18n('Expected an npub1... address, got a ${prefix}1... address.', {
        prefix: decoded.prefix,
      }),
    )
  }
  return decoded.hex
}
