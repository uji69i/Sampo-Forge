import type { MihomoProxy } from './mihomo/types'

export type CipherStrength = 'strong' | 'moderate' | 'weak' | 'none' | 'info'

export interface ProxyExplanation {
  protocol: { name: string; descriptionKey: string }
  cipher:
    | { name: string; strength: CipherStrength; descriptionKey: string }
    | null
  network: { name: string; descriptionKey: string } | null
  tls: {
    enabled: boolean
    sni?: string
    reality?: boolean
    descriptionKey: string
  }
  risks: { level: 'info' | 'warning' | 'danger'; textKey: string }[]
}

const PROTOCOL_DESCRIPTIONS: Record<
  string,
  { name: string; descriptionKey: string }
> = {
  ss: {
    name: 'Shadowsocks',
    descriptionKey: 'proxyToolkit.explain.protocol.ss',
  },
  vmess: {
    name: 'VMess',
    descriptionKey: 'proxyToolkit.explain.protocol.vmess',
  },
  vless: {
    name: 'VLESS',
    descriptionKey: 'proxyToolkit.explain.protocol.vless',
  },
  trojan: {
    name: 'Trojan',
    descriptionKey: 'proxyToolkit.explain.protocol.trojan',
  },
  hysteria: {
    name: 'Hysteria',
    descriptionKey: 'proxyToolkit.explain.protocol.hysteria',
  },
  hysteria2: {
    name: 'Hysteria2',
    descriptionKey: 'proxyToolkit.explain.protocol.hysteria2',
  },
  tuic: {
    name: 'TUIC',
    descriptionKey: 'proxyToolkit.explain.protocol.tuic',
  },
  ssr: {
    name: 'ShadowsocksR',
    descriptionKey: 'proxyToolkit.explain.protocol.ssr',
  },
  wireguard: {
    name: 'WireGuard',
    descriptionKey: 'proxyToolkit.explain.protocol.wireguard',
  },
}

const CIPHER_STRENGTH: Record<string, CipherStrength> = {
  'aes-128-gcm': 'strong',
  'aes-192-gcm': 'strong',
  'aes-256-gcm': 'strong',
  'chacha20-ietf-poly1305': 'strong',
  'chacha20-poly1305': 'strong',
  'xchacha20-ietf-poly1305': 'strong',
  '2022-blake3-aes-128-gcm': 'strong',
  '2022-blake3-aes-256-gcm': 'strong',
  '2022-blake3-chacha20-poly1305': 'strong',
  'aes-128-cfb': 'moderate',
  'aes-192-cfb': 'moderate',
  'aes-256-cfb': 'moderate',
  auto: 'info',
  none: 'none',
}

const CIPHER_DESCRIPTION_KEYS: Record<CipherStrength, string> = {
  strong: 'proxyToolkit.explain.cipher.strong',
  moderate: 'proxyToolkit.explain.cipher.moderate',
  weak: 'proxyToolkit.explain.cipher.weak',
  none: 'proxyToolkit.explain.cipher.none',
  info: 'proxyToolkit.explain.cipher.info',
}

const NETWORK_DESCRIPTIONS: Record<string, { name: string; descriptionKey: string }> = {
  tcp: { name: 'TCP', descriptionKey: 'proxyToolkit.explain.network.tcp' },
  ws: { name: 'WebSocket', descriptionKey: 'proxyToolkit.explain.network.ws' },
  grpc: { name: 'gRPC', descriptionKey: 'proxyToolkit.explain.network.grpc' },
  h2: { name: 'HTTP/2', descriptionKey: 'proxyToolkit.explain.network.h2' },
  http: { name: 'HTTP', descriptionKey: 'proxyToolkit.explain.network.http' },
  kcp: { name: 'mKCP', descriptionKey: 'proxyToolkit.explain.network.kcp' },
}

export function explainProxy(proxy: MihomoProxy): ProxyExplanation {
  const type = (proxy.type || '').toLowerCase()
  const protocol =
    PROTOCOL_DESCRIPTIONS[type] ?? {
      name: type || 'Unknown',
      descriptionKey: 'proxyToolkit.explain.protocol.unknown',
    }

  const cipherName = (proxy.cipher || proxy.encryption || '').toLowerCase().trim()
  const strength: CipherStrength = cipherName
    ? CIPHER_STRENGTH[cipherName] ?? 'weak'
    : 'info'
  const cipher = cipherName
    ? {
        name: cipherName || 'auto',
        strength,
        descriptionKey: CIPHER_DESCRIPTION_KEYS[strength],
      }
    : null

  const net = (proxy.network || 'tcp').toLowerCase()
  const network =
    NETWORK_DESCRIPTIONS[net] ?? (net ? { name: net.toUpperCase(), descriptionKey: 'proxyToolkit.explain.network.other' } : null)

  const tlsEnabled = !!proxy.tls
  const reality = !!(proxy['reality-opts'] && Object.keys(proxy['reality-opts'] as object).length)
  const sni = proxy.servername || proxy.sni

  let tlsDescriptionKey = 'proxyToolkit.explain.tls.off'
  if (tlsEnabled) {
    tlsDescriptionKey = reality
      ? 'proxyToolkit.explain.tls.reality'
      : 'proxyToolkit.explain.tls.on'
  }

  const risks: { level: 'info' | 'warning' | 'danger'; textKey: string }[] = []

  if (!tlsEnabled && type !== 'ss' && type !== 'wireguard') {
    risks.push({ level: 'warning', textKey: 'proxyToolkit.explain.risk.noTls' })
  }
  if (proxy['skip-cert-verify'] || proxy.insecure) {
    risks.push({ level: 'danger', textKey: 'proxyToolkit.explain.risk.skipVerify' })
  }
  if (strength === 'weak' || strength === 'none') {
    risks.push({ level: 'warning', textKey: 'proxyToolkit.explain.risk.weakCipher' })
  }
  if (type === 'ssr') {
    risks.push({ level: 'info', textKey: 'proxyToolkit.explain.risk.ssrLegacy' })
  }
  if (type === 'vmess' && (proxy.alterId ?? 0) > 0) {
    risks.push({ level: 'warning', textKey: 'proxyToolkit.explain.risk.alterId' })
  }
  if (cipherName === 'none' || strength === 'none') {
    risks.push({ level: 'danger', textKey: 'proxyToolkit.explain.risk.noEncryption' })
  }

  return {
    protocol,
    cipher,
    network,
    tls: {
      enabled: tlsEnabled,
      sni: typeof sni === 'string' ? sni : undefined,
      reality: reality || undefined,
      descriptionKey: tlsDescriptionKey,
    },
    risks,
  }
}
