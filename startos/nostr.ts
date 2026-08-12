// Minimal NIP-19 bech32 decoder for npub/nsec, no external dependency.
// Standard bech32 (not bech32m) per BIP-173 -- this is the well-known
// reference algorithm, reproduced directly (checksum generator constants,
// charset, bit conversion), not a novel implementation.

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const v of values) {
    const b = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i]
    }
  }
  return chk
}

function hrpExpand(hrp: string): number[] {
  const ret: number[] = []
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5)
  ret.push(0)
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31)
  return ret
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0
  let bits = 0
  const ret: number[] = []
  const maxv = (1 << toBits) - 1
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) throw new Error('invalid data for bit conversion')
    acc = (acc << fromBits) | value
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      ret.push((acc >> bits) & maxv)
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv)
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    throw new Error('invalid bech32 padding')
  }
  return ret
}

/** Decodes a NIP-19 bech32 string (npub1... or nsec1...) into { prefix, hex }. Throws on malformed input. */
export function decodeBech32(input: string): { prefix: string; hex: string } {
  const value = input.trim().toLowerCase()
  const pos = value.lastIndexOf('1')
  if (pos < 1 || pos + 7 > value.length || value.length > 90) {
    throw new Error('not a valid bech32 string')
  }
  const prefix = value.slice(0, pos)
  const dataPart = value.slice(pos + 1)
  const data: number[] = []
  for (const c of dataPart) {
    const d = CHARSET.indexOf(c)
    if (d === -1) throw new Error('invalid bech32 character')
    data.push(d)
  }
  if (polymod(hrpExpand(prefix).concat(data)) !== 1) {
    throw new Error('invalid bech32 checksum')
  }
  const bytes = convertBits(data.slice(0, -6), 5, 8, false)
  if (bytes.length !== 32) throw new Error('unexpected bech32 payload length')
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('')
  return { prefix, hex }
}
