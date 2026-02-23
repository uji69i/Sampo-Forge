import { x25519 } from '@noble/curves/ed25519.js'

/** Clamp Curve25519 private key bytes (WireGuard/X25519 spec) */
function clampPrivateKeyBytes(bytes: Uint8Array): void {
  if (bytes.length !== 32) return
  bytes[0] &= 248
  bytes[31] &= 127
  bytes[31] |= 64
}

/** Derive 32 bytes for private key from seed using SHA-256 */
async function seedToPrivateKeyBytes(seed: string, suffix: string = ''): Promise<Uint8Array> {
  const data = new TextEncoder().encode(seed + suffix)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  clampPrivateKeyBytes(bytes)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export interface KeyPair {
  privateKey: string
  publicKey: string
}

/** Generate key pair: from seed (deterministic) or random. Browser-safe. */
export async function generateKeyPair(seed: string, index?: number): Promise<KeyPair> {
  let privBytes: Uint8Array
  if (seed.trim() === '') {
    privBytes = x25519.utils.randomSecretKey()
  } else {
    const suffix = index !== undefined ? String(index) : 'server'
    privBytes = await seedToPrivateKeyBytes(seed.trim(), suffix)
  }
  const publicKeyBytes = x25519.getPublicKey(privBytes)
  return {
    privateKey: bytesToBase64(privBytes),
    publicKey: bytesToBase64(publicKeyBytes),
  }
}

/** Generate PSK: from seed or random. Browser-safe. */
export async function generatePsk(seed: string): Promise<string> {
  if (seed.trim() === '') {
    const bytes = x25519.utils.randomSecretKey()
    return bytesToBase64(bytes)
  }
  const bytes = await seedToPrivateKeyBytes(seed.trim(), 'psk')
  return bytesToBase64(bytes)
}

/** Parse CIDR to get base address and prefix (e.g. 10.0.0.0/24 -> base 10.0.0.0, prefix 24) */
export function parseCidr(cidr: string): { base: number[]; prefix: number } | null {
  const m = cidr.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/)
  if (!m) return null
  const a = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)]
  const prefix = parseInt(m[5], 10)
  if (prefix < 0 || prefix > 32) return null
  if (a.some((x) => x < 0 || x > 255)) return null
  return { base: a, prefix }
}

/** Get IPv4 address: first usable host (base+1) for index 0 (server), then +1 per client (e.g. 10.0.0.0/24 → server 10.0.0.1, clients 10.0.0.2, 10.0.0.3, …) */
export function getAddressFromCidr(cidr: string, index: number): string | null {
  const parsed = parseCidr(cidr)
  if (!parsed) return null
  const { base, prefix } = parsed
  const hostBits = 32 - prefix
  const total = hostBits >= 32 ? 0 : Math.pow(2, hostBits)
  const maxHosts = total <= 2 ? total : total - 2
  if (index < 0 || (maxHosts > 0 && index >= maxHosts)) return null
  const addr = (base[0]! << 24) | (base[1]! << 16) | (base[2]! << 8) | base[3]!
  const host = total <= 2 ? addr + index : addr + 1 + index
  return [
    (host >>> 24) & 0xff,
    (host >>> 16) & 0xff,
    (host >>> 8) & 0xff,
    host & 0xff,
  ].join('.')
}

export type AwgVersion = '1.0' | '1.5' | '2.0'

export interface AmneziaWGOptions {
  version: AwgVersion
  Jc?: number
  Jmin?: number
  Jmax?: number
  S1?: number
  S2?: number
  S3?: number
  S4?: number
  H1?: number
  H2?: number
  H3?: number
  H4?: number
  I1?: string
  I2?: string
  I3?: string
  I4?: string
  I5?: string
}

export interface GeneratorParams {
  seed: string
  listenPort: number
  numClients: number
  cidr: string
  clientAllowedIPs: string
  endpoint: string
  dns: string
  postUp: string
  postDown: string
  usePsk: boolean
  amneziaWG: boolean
  amneziaOptions?: AmneziaWGOptions
}

export interface GeneratedConfig {
  name: string
  content: string
}

function appendAmneziaLines(lines: string[], opt: AmneziaWGOptions): void {
  const addNum = (key: string, value: number | undefined) => {
    if (value !== undefined && value !== null) lines.push(`${key} = ${value}`)
  }
  const addStr = (key: string, value: string | undefined) => {
    if (value != null && String(value).trim()) lines.push(`${key} = ${String(value).trim()}`)
  }
  addNum('Jc', opt.Jc)
  addNum('Jmin', opt.Jmin)
  addNum('Jmax', opt.Jmax)
  addNum('S1', opt.S1)
  addNum('S2', opt.S2)
  if (opt.version === '2.0') {
    addNum('S3', opt.S3)
    addNum('S4', opt.S4)
  }
  addNum('H1', opt.H1)
  addNum('H2', opt.H2)
  addNum('H3', opt.H3)
  addNum('H4', opt.H4)
  if (opt.version === '1.5' || opt.version === '2.0') {
    addStr('I1', opt.I1)
    addStr('I2', opt.I2)
    addStr('I3', opt.I3)
    addStr('I4', opt.I4)
    addStr('I5', opt.I5)
  }
}

/** Build server config and client configs */
export async function generateConfigs(params: GeneratorParams): Promise<GeneratedConfig[]> {
  const {
    seed,
    listenPort,
    numClients,
    cidr,
    clientAllowedIPs,
    endpoint,
    dns,
    postUp,
    postDown,
    usePsk,
    amneziaWG,
    amneziaOptions,
  } = params

  const serverKeys = await generateKeyPair(seed)
  const clientKeysList: KeyPair[] = []
  for (let i = 0; i < numClients; i++) {
    clientKeysList.push(await generateKeyPair(seed, i))
  }

  let psk: string | undefined
  if (usePsk) {
    psk = await generatePsk(seed)
  }

  const serverAddress = getAddressFromCidr(cidr, 0)
  if (!serverAddress) throw new Error('Invalid CIDR')

  const serverLines: string[] = [
    '[Interface]',
    `PrivateKey = ${serverKeys.privateKey}`,
    `Address = ${serverAddress}/${params.cidr.split('/')[1] ?? '24'}`,
    `ListenPort = ${listenPort}`,
  ]
  if (postUp.trim()) serverLines.push(`PostUp = ${postUp.trim()}`)
  if (postDown.trim()) serverLines.push(`PostDown = ${postDown.trim()}`)
  if (amneziaWG && amneziaOptions) {
    appendAmneziaLines(serverLines, amneziaOptions)
  }

  for (let i = 0; i < numClients; i++) {
    const clientAddr = getAddressFromCidr(cidr, i + 1)
    if (!clientAddr) continue
    serverLines.push('')
    serverLines.push('[Peer]')
    serverLines.push(`PublicKey = ${clientKeysList[i]!.publicKey}`)
    serverLines.push(`AllowedIPs = ${clientAddr}/32`)
    if (psk) serverLines.push(`PresharedKey = ${psk}`)
  }

  const serverContent = serverLines.join('\n')
  const result: GeneratedConfig[] = [{ name: 'server.conf', content: serverContent }]

  for (let i = 0; i < numClients; i++) {
    const clientAddr = getAddressFromCidr(cidr, i + 1)
    if (!clientAddr) continue
    const clientLines: string[] = [
      '[Interface]',
      `PrivateKey = ${clientKeysList[i]!.privateKey}`,
      `Address = ${clientAddr}/32`,
    ]
    if (dns.trim()) clientLines.push(`DNS = ${dns.trim()}`)
    if (amneziaWG && amneziaOptions) {
      appendAmneziaLines(clientLines, amneziaOptions)
    }
    clientLines.push('')
    clientLines.push('[Peer]')
    clientLines.push(`PublicKey = ${serverKeys.publicKey}`)
    if (endpoint.trim()) clientLines.push(`Endpoint = ${endpoint.trim()}`)
    clientLines.push(`AllowedIPs = ${clientAllowedIPs.trim() || '0.0.0.0/0, ::/0'}`)
    if (psk) clientLines.push(`PresharedKey = ${psk}`)
    result.push({
      name: `client-${i + 1}.conf`,
      content: clientLines.join('\n'),
    })
  }

  return result
}

/** Random int in [min, max] inclusive (browser-safe) */
function randomInt(min: number, max: number): number {
  const range = max - min + 1
  return min + Math.floor(Math.random() * range)
}

/** Random 32-bit unsigned integer (browser-safe) */
function randomInt32(): number {
  return (Math.random() * 0x100000000) >>> 0
}

/** Generate random numeric AWG parameters for the given version */
export function generateRandomAwgParams(version: AwgVersion): Pick<
  AmneziaWGOptions,
  'Jc' | 'Jmin' | 'Jmax' | 'S1' | 'S2' | 'S3' | 'S4' | 'H1' | 'H2' | 'H3' | 'H4'
> {
  const jmin = randomInt(10, 64)
  const jmax = randomInt(Math.max(jmin, 50), 1024)
  const result: Pick<
    AmneziaWGOptions,
    'Jc' | 'Jmin' | 'Jmax' | 'S1' | 'S2' | 'S3' | 'S4' | 'H1' | 'H2' | 'H3' | 'H4'
  > = {
    Jc: randomInt(1, 8),
    Jmin: jmin,
    Jmax: jmax,
    S1: randomInt(15, 64),
    S2: randomInt(15, 64),
    H1: randomInt32(),
    H2: randomInt32(),
    H3: randomInt32(),
    H4: randomInt32(),
  }
  if (version === '2.0') {
    result.S3 = randomInt(15, 64)
    result.S4 = randomInt(15, 64)
  }
  return result
}

/** Validate port 1-65535 */
export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/** Validate number of clients >= 1 */
export function validateNumClients(n: number): boolean {
  return Number.isInteger(n) && n >= 1
}

/** Validate CIDR format */
export function validateCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null
}
