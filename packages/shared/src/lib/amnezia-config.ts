import pako from 'pako'

/* ── Base64url helpers ── */
export function b64urlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const MAGIC = 0x07c00100

export interface AmneziaConfigContainer {
  container?: string
  [key: string]: unknown
}

export interface AmneziaConfig {
  hostName?: string
  dns1?: string
  dns2?: string
  defaultContainer?: string
  description?: string
  containers?: AmneziaConfigContainer[]
}

/** Decode vpn:// or raw base64 input to config object */
export function decodeConfig(input: string): AmneziaConfig {
  const encoded = input.replace(/^vpn:\/\//, '')
  const bytes = b64urlToBytes(encoded)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const first = view.getUint32(0, false)

  if (first === MAGIC) {
    const zlibData = bytes.slice(12)
    const json = pako.inflate(zlibData, { to: 'string' })
    return JSON.parse(json) as AmneziaConfig
  }

  const zlibData = bytes.slice(4)
  try {
    const json = pako.inflate(zlibData, { to: 'string' })
    return JSON.parse(json) as AmneziaConfig
  } catch {
    return JSON.parse(new TextDecoder().decode(bytes)) as AmneziaConfig
  }
}

/** Encode config object to vpn:// URL string */
export function encodeConfig(config: AmneziaConfig): string {
  const jsonStr = JSON.stringify(config, null, 4)
  const plain = new TextEncoder().encode(jsonStr)
  const compressed = pako.deflate(plain)

  const header = new Uint8Array(4)
  new DataView(header.buffer).setUint32(0, plain.length, false)

  const combined = new Uint8Array(4 + compressed.length)
  combined.set(header)
  combined.set(compressed, 4)

  return 'vpn://' + bytesToB64url(combined)
}

/** Extract connection info from config for display */
export function extractInfo(config: AmneziaConfig): Record<string, string> {
  const info: Record<string, string> = {}
  info['Host'] = config.hostName ?? '—'
  info['DNS 1'] = config.dns1 ?? '—'
  info['DNS 2'] = config.dns2 ?? '—'
  info['Default Container'] = config.defaultContainer ?? '—'
  info['Description'] = config.description ?? '—'

  if (Array.isArray(config.containers)) {
    for (const c of config.containers) {
      const proto = c.container ?? ''
      const key = proto.replace('amnezia-', '')
      const inner = c[key] as { last_config?: string | object; port?: number; transport_proto?: string } | undefined
      if (!inner) continue

      try {
        const lc =
          typeof inner.last_config === 'string'
            ? (JSON.parse(inner.last_config) as Record<string, unknown>)
            : (inner.last_config as Record<string, unknown> | undefined)
        if (lc) {
          if (lc.client_ip) info['Client IP'] = String(lc.client_ip)
          if (lc.port) info['Port'] = String(lc.port)
          if (lc.server_pub_key) info['Server PubKey'] = String(lc.server_pub_key)
          if (lc.mtu) info['MTU'] = String(lc.mtu)
          if (lc.Jc != null) info['Jc'] = String(lc.Jc)
          if (lc.Jmin != null) info['Jmin'] = String(lc.Jmin)
          if (lc.Jmax != null) info['Jmax'] = String(lc.Jmax)
          if (lc.S1 != null) info['S1'] = String(lc.S1)
          if (lc.S2 != null) info['S2'] = String(lc.S2)
        }
      } catch {
        /* ignore */
      }

      if (inner.port) info['Port'] = String(inner.port)
      if (inner.transport_proto) info['Transport'] = inner.transport_proto
    }
  }

  return info
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
