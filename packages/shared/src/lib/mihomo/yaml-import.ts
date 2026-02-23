import { parse as yamlParse } from 'yaml'
import type {
  MihomoProxy,
  ProxyGroup,
  RuleProvider,
  RuleEntry,
  ManualRule,
  ManualRuleType,
  MatchState,
  Subscription,
  GeneralSettings,
  DnsSettings,
  Listener,
  ListenerType,
} from './types'

const MANUAL_RULE_TYPES: ManualRuleType[] = [
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-ASN',
  'PROCESS-NAME',
  'PROCESS-PATH',
  'IN-NAME',
  'IN-PORT',
  'IN-TYPE',
  'IN-USER',
]

const LISTENER_TYPES: ListenerType[] = [
  'http', 'socks', 'mixed', 'redirect', 'tproxy', 'tun',
  'shadowsocks', 'vmess', 'vless', 'trojan', 'tuic', 'hysteria2', 'tunnel',
]

export interface ParseYamlResult {
  state: Partial<{
    proxies: MihomoProxy[]
    groups: ProxyGroup[]
    subs: Subscription[]
    ruleProviders: RuleProvider[]
    rulesGeosite: Map<string, { action: string; target: string }>
    rulesGeoip: Map<string, { action: string; target: string }>
    manualRules: ManualRule[]
    ruleOrder: RuleEntry[]
    match: MatchState
    generalSettings: GeneralSettings
    dnsSettings: DnsSettings
    listeners: Listener[]
    useGeneralSettings: boolean
    useDnsSettings: boolean
    useListeners: boolean
  }>
  errors: string[]
}

function toMihomoProxy(raw: unknown): MihomoProxy | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const type = typeof o.type === 'string' ? o.type : ''
  const server = typeof o.server === 'string' ? o.server : ''
  if (!server) return null
  const p: MihomoProxy = { type, server }
  if (typeof o.name === 'string') p.name = o.name
  if (typeof o.port === 'number') p.port = o.port
  const strKeys = [
    'uuid', 'password', 'cipher', 'network', 'flow', 'servername', 'sni',
    'auth_str', 'auth', 'token', 'protocol', 'obfs', 'protocol-param', 'obfs-param',
    'encryption', 'seed', 'header', 'plugin', 'client-fingerprint',
  ] as const
  for (const k of strKeys) {
    if (typeof o[k] === 'string') (p as Record<string, unknown>)[k] = o[k]
  }
  if (typeof o.alterId === 'number') p.alterId = o.alterId
  if (typeof o.tls === 'boolean') p.tls = o.tls
  if (typeof o.udp === 'boolean') p.udp = o.udp
  if (typeof o.insecure === 'boolean') p.insecure = o.insecure
  if (typeof o['skip-cert-verify'] === 'boolean') p['skip-cert-verify'] = o['skip-cert-verify']
  if (typeof o['up-mbps'] === 'number') p['up-mbps'] = o['up-mbps']
  if (typeof o['down-mbps'] === 'number') p['down-mbps'] = o['down-mbps']
  if (Array.isArray(o.alpn)) p.alpn = o.alpn.filter((x): x is string => typeof x === 'string')
  if (o['plugin-opts'] && typeof o['plugin-opts'] === 'object')
    p['plugin-opts'] = o['plugin-opts'] as Record<string, string>
  if (o['ws-opts'] && typeof o['ws-opts'] === 'object')
    p['ws-opts'] = o['ws-opts'] as MihomoProxy['ws-opts']
  if (o['reality-opts'] && typeof o['reality-opts'] === 'object')
    p['reality-opts'] = o['reality-opts'] as Record<string, string>
  if (o['grpc-opts'] && typeof o['grpc-opts'] === 'object')
    p['grpc-opts'] = o['grpc-opts'] as Record<string, string>
  if (o['h2-opts'] && typeof o['h2-opts'] === 'object')
    p['h2-opts'] = o['h2-opts'] as MihomoProxy['h2-opts']
  if (o['http-opts'] && typeof o['http-opts'] === 'object')
    p['http-opts'] = o['http-opts'] as MihomoProxy['http-opts']
  if (o['kcp-opts'] && typeof o['kcp-opts'] === 'object')
    p['kcp-opts'] = o['kcp-opts'] as MihomoProxy['kcp-opts']
  if (o['tcp-opts'] && typeof o['tcp-opts'] === 'object')
    p['tcp-opts'] = o['tcp-opts'] as MihomoProxy['tcp-opts']
  if (type === 'wireguard') {
    if (typeof o.ip === 'string') p.ip = o.ip
    if (typeof o.ipv6 === 'string') p.ipv6 = o.ipv6
    if (typeof o['private-key'] === 'string') p['private-key'] = o['private-key']
    if (typeof o['public-key'] === 'string') p['public-key'] = o['public-key']
    if (Array.isArray(o['allowed-ips'])) p['allowed-ips'] = (o['allowed-ips'] as unknown[]).filter((x): x is string => typeof x === 'string')
    if (typeof o['pre-shared-key'] === 'string') p['pre-shared-key'] = o['pre-shared-key']
    if (o.reserved !== undefined) p.reserved = o.reserved as string | number[]
    if (typeof o['persistent-keepalive'] === 'number') p['persistent-keepalive'] = o['persistent-keepalive']
    if (typeof o.mtu === 'number') p.mtu = o.mtu
    if (typeof o['remote-dns-resolve'] === 'boolean') p['remote-dns-resolve'] = o['remote-dns-resolve']
    if (Array.isArray(o.dns)) p.dns = (o.dns as unknown[]).filter((x): x is string => typeof x === 'string')
    if (o['amnezia-wg-option'] && typeof o['amnezia-wg-option'] === 'object')
      p['amnezia-wg-option'] = o['amnezia-wg-option'] as Record<string, unknown>
  }
  for (const k of Object.keys(o)) {
    if (k in p) continue
    const v = o[k]
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ||
        (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'string' || typeof v[0] === 'number')) ||
        (v && typeof v === 'object' && !Array.isArray(v)))
      (p as Record<string, unknown>)[k] = v
  }
  return p
}

function parseProxies(proxiesRaw: unknown): MihomoProxy[] {
  if (!Array.isArray(proxiesRaw)) return []
  const out: MihomoProxy[] = []
  for (const item of proxiesRaw) {
    const p = toMihomoProxy(item)
    if (p) out.push(p)
  }
  return out
}

function parseProxyProviders(proxyProvidersRaw: unknown): Subscription[] {
  if (!proxyProvidersRaw || typeof proxyProvidersRaw !== 'object') return []
  const out: Subscription[] = []
  for (const [name, val] of Object.entries(proxyProvidersRaw)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, unknown>
    const url = typeof v.url === 'string' ? v.url : ''
    if (!url) continue
    const sub: Subscription = { name, url, fetchMode: 'DIRECT' }
    if (typeof v.interval === 'number') sub.interval = v.interval
    if (typeof v.proxy === 'string' && v.proxy) {
      sub.fetchMode = 'PROXY'
      sub.fetchProxy = v.proxy
    }
    if (typeof v['skip-cert-verify'] === 'boolean') sub.skipCertVerify = v['skip-cert-verify']
    out.push(sub)
  }
  return out
}

function parseProxyGroups(proxyGroupsRaw: unknown): ProxyGroup[] {
  if (!Array.isArray(proxyGroupsRaw)) return []
  const out: ProxyGroup[] = []
  for (const g of proxyGroupsRaw) {
    if (!g || typeof g !== 'object') continue
    const o = g as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name : ''
    const type = (typeof o.type === 'string' ? o.type : 'select') as ProxyGroup['type']
    if (!name) continue
    const proxies: string[] = Array.isArray(o.proxies)
      ? o.proxies.filter((x): x is string => typeof x === 'string')
      : []
    const manual: string[] = Array.isArray(o.manual)
      ? o.manual.filter((x): x is string => typeof x === 'string')
      : []
    const useSubs: string[] = Array.isArray(o.use)
      ? o.use.filter((x): x is string => typeof x === 'string')
      : []
    const icon = typeof o.icon === 'string' ? o.icon : undefined
    out.push({ name, type, proxies, manual, useSubs: useSubs.length ? useSubs : undefined, icon })
  }
  return out
}

function parseRuleProviders(ruleProvidersRaw: unknown): RuleProvider[] {
  if (!ruleProvidersRaw || typeof ruleProvidersRaw !== 'object') return []
  const out: RuleProvider[] = []
  for (const [name, val] of Object.entries(ruleProvidersRaw)) {
    if (!val || typeof val !== 'object') continue
    const v = val as Record<string, unknown>
    const url = typeof v.url === 'string' ? v.url : ''
    if (!url) continue
    const rp: RuleProvider = { name, url }
    if (typeof v.type === 'string') rp.type = v.type
    if (typeof v.path === 'string') rp.path = v.path
    if (typeof v.interval === 'number') rp.interval = v.interval
    if (typeof v.proxy === 'string') rp.proxy = v.proxy
    if (typeof v.behavior === 'string') rp.behavior = v.behavior
    if (typeof v.format === 'string') rp.format = v.format
    out.push(rp)
  }
  return out
}

function parseRuleLine(line: string): RuleEntry | ManualRule | { kind: 'MATCH'; policy: string } | null {
  const s = line.trim()
  if (!s) return null
  const parts = s.split(',')
  if (parts.length < 2) return null
  const first = parts[0].trim()
  if (first === 'GEOSITE') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'GEOSITE', key, policy }
  }
  if (first === 'GEOIP') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'GEOIP', key, policy }
  }
  if (first === 'RULE-SET') {
    const key = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!key) return null
    return { kind: 'RULE-SET', key, policy }
  }
  if (first === 'MATCH') {
    const policy = parts[1]?.trim() ?? 'DIRECT'
    return { kind: 'MATCH', policy }
  }
  if (MANUAL_RULE_TYPES.includes(first as ManualRuleType)) {
    const value = parts[1]?.trim() ?? ''
    const policy = parts[2]?.trim() ?? 'DIRECT'
    if (!value) return null
    return { type: first as ManualRuleType, value, policy }
  }
  const policy = parts[parts.length - 1]?.trim() ?? 'DIRECT'
  const key = parts.slice(0, -1).join(',').trim()
  if (!key) return null
  return { kind: 'MANUAL', key: s, policy }
}

function matchStateFromPolicy(policy: string, groupNames: string[]): MatchState {
  if (policy === 'DIRECT' || policy === 'REJECT')
    return { mode: 'builtin', value: policy }
  if (groupNames.includes(policy))
    return { mode: 'group', value: policy }
  return { mode: 'auto', value: '' }
}

function parseGeneralSettings(root: Record<string, unknown>): GeneralSettings {
  const g: GeneralSettings = {
    mode: (typeof root.mode === 'string' && ['rule', 'global', 'direct'].includes(root.mode))
      ? root.mode as GeneralSettings['mode']
      : 'rule',
    allowLan: typeof root['allow-lan'] === 'boolean' ? root['allow-lan'] : false,
    ipv6: typeof root.ipv6 === 'boolean' ? root.ipv6 : false,
    logLevel: (typeof root['log-level'] === 'string' && ['silent', 'error', 'warning', 'info', 'debug'].includes(root['log-level']))
      ? root['log-level'] as GeneralSettings['logLevel']
      : 'info',
    unifiedDelay: typeof root['unified-delay'] === 'boolean' ? root['unified-delay'] : true,
    geodataMode: typeof root['geodata-mode'] === 'boolean' ? root['geodata-mode'] : false,
    tcpConcurrent: typeof root['tcp-concurrent'] === 'boolean' ? root['tcp-concurrent'] : false,
  }
  if (typeof root['mixed-port'] === 'number') g.mixedPort = root['mixed-port']
  if (typeof root.port === 'number') g.port = root.port
  if (typeof root['socks-port'] === 'number') g.socksPort = root['socks-port']
  if (typeof root['redir-port'] === 'number') g.redirPort = root['redir-port']
  if (typeof root['tproxy-port'] === 'number') g.tproxyPort = root['tproxy-port']
  if (typeof root['bind-address'] === 'string') g.bindAddress = root['bind-address']
  if (typeof root['external-controller'] === 'string') g.externalController = root['external-controller']
  if (typeof root.secret === 'string') g.secret = root.secret
  if (typeof root['find-process-mode'] === 'string') g.findProcessMode = root['find-process-mode'] as GeneralSettings['findProcessMode']
  if (typeof root['global-client-fingerprint'] === 'string') g.globalClientFingerprint = root['global-client-fingerprint']
  return g
}

function parseDnsSettings(dnsRaw: unknown): DnsSettings {
  const d: DnsSettings = {
    enable: true,
    enhancedMode: 'redir-host',
    fakeIpFilter: [],
    ipv6: false,
    useHosts: true,
    useSystemHosts: true,
    defaultNameserver: [],
    nameserver: [],
    fallback: [],
    nameserverPolicy: [],
    proxyServerNameserver: [],
  }
  if (!dnsRaw || typeof dnsRaw !== 'object') return d
  const o = dnsRaw as Record<string, unknown>
  if (typeof o.enable === 'boolean') d.enable = o.enable
  if (typeof o.listen === 'string') d.listen = o.listen
  if (typeof o['enhanced-mode'] === 'string' && (o['enhanced-mode'] === 'fake-ip' || o['enhanced-mode'] === 'redir-host'))
    d.enhancedMode = o['enhanced-mode']
  if (typeof o['fake-ip-range'] === 'string') d.fakeIpRange = o['fake-ip-range']
  if (typeof o['fake-ip-filter-mode'] === 'string') d.fakeIpFilterMode = o['fake-ip-filter-mode'] as DnsSettings['fakeIpFilterMode']
  if (Array.isArray(o['fake-ip-filter'])) d.fakeIpFilter = o['fake-ip-filter'].filter((x): x is string => typeof x === 'string')
  if (typeof o.ipv6 === 'boolean') d.ipv6 = o.ipv6
  if (typeof o['use-hosts'] === 'boolean') d.useHosts = o['use-hosts']
  if (typeof o['use-system-hosts'] === 'boolean') d.useSystemHosts = o['use-system-hosts']
  if (typeof o['cache-algorithm'] === 'string') d.cacheAlgorithm = o['cache-algorithm'] as 'arc' | 'lru'
  if (Array.isArray(o['default-nameserver'])) d.defaultNameserver = o['default-nameserver'].filter((x): x is string => typeof x === 'string')
  if (Array.isArray(o.nameserver)) d.nameserver = o.nameserver.filter((x): x is string => typeof x === 'string')
  if (Array.isArray(o.fallback)) d.fallback = o.fallback.filter((x): x is string => typeof x === 'string')
  if (o['fallback-filter'] && typeof o['fallback-filter'] === 'object') {
    const ff = o['fallback-filter'] as Record<string, unknown>
    d.fallbackFilter = {
      geoip: typeof ff.geoip === 'boolean' ? ff.geoip : false,
      geoipCode: typeof ff['geoip-code'] === 'string' ? ff['geoip-code'] : undefined,
      geosite: Array.isArray(ff.geosite) ? ff.geosite.filter((x): x is string => typeof x === 'string') : undefined,
      ipcidr: Array.isArray(ff.ipcidr) ? ff.ipcidr.filter((x): x is string => typeof x === 'string') : undefined,
      domain: Array.isArray(ff.domain) ? ff.domain.filter((x): x is string => typeof x === 'string') : undefined,
    }
  }
  if (o['nameserver-policy'] && typeof o['nameserver-policy'] === 'object') {
    const np = o['nameserver-policy'] as Record<string, unknown>
    for (const [pattern, val] of Object.entries(np)) {
      const servers = Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : (typeof val === 'string' ? [val] : [])
      if (servers.length) d.nameserverPolicy.push({ pattern, servers })
    }
  }
  if (Array.isArray(o['proxy-server-nameserver'])) d.proxyServerNameserver = o['proxy-server-nameserver'].filter((x): x is string => typeof x === 'string')
  return d
}

function parseListeners(listenersRaw: unknown): Listener[] {
  if (!Array.isArray(listenersRaw)) return []
  const out: Listener[] = []
  for (const item of listenersRaw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name : ''
    const type = (typeof o.type === 'string' && LISTENER_TYPES.includes(o.type as ListenerType)) ? o.type as ListenerType : 'mixed'
    const port = typeof o.port === 'number' ? o.port : 0
    const listen = typeof o.listen === 'string' ? o.listen : '0.0.0.0'
    if (!name) continue
    const l: Listener = { name, type, port, listen }
    if (typeof o.udp === 'boolean') l.udp = o.udp
    if (typeof o.rule === 'string') l.rule = o.rule
    if (typeof o.proxy === 'string') l.proxy = o.proxy
    const knownKeys = new Set(['name', 'type', 'port', 'listen', 'udp', 'rule', 'proxy'])
    const extra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      if (knownKeys.has(k) || v == null) continue
      extra[k] = v
    }
    if (Object.keys(extra).length) l.extraFields = extra
    out.push(l)
  }
  return out
}

/**
 * Parse Mihomo/Clash YAML config string into partial MihomoState.
 * Does not restore linksRaw (proxies are already parsed).
 */
export function parseYamlToState(yamlString: string): ParseYamlResult {
  const errors: string[] = []
  const state: ParseYamlResult['state'] = {}

  let doc: unknown
  try {
    doc = yamlParse(yamlString, { strict: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(msg)
    return { state: {}, errors }
  }

  if (!doc || typeof doc !== 'object') {
    errors.push('YAML is empty or not an object')
    return { state: {}, errors }
  }

  const root = doc as Record<string, unknown>

  if (root.proxies != null) {
    state.proxies = parseProxies(root.proxies)
  }

  if (root['proxy-providers'] != null) {
    state.subs = parseProxyProviders(root['proxy-providers'])
  }

  if (root['proxy-groups'] != null) {
    state.groups = parseProxyGroups(root['proxy-groups'])
  }

  const hasGeneral = ['mode', 'mixed-port', 'allow-lan', 'bind-address', 'log-level', 'external-controller'].some(
    (k) => root[k] != null
  )
  if (hasGeneral) {
    state.generalSettings = parseGeneralSettings(root)
    state.useGeneralSettings = true
  }

  if (root.dns != null) {
    state.dnsSettings = parseDnsSettings(root.dns)
    state.useDnsSettings = true
  }

  if (root.listeners != null && Array.isArray(root.listeners)) {
    state.listeners = parseListeners(root.listeners)
    state.useListeners = true
  }

  const groupNames = (state.groups ?? []).map((g) => g.name)

  if (root['rule-providers'] != null) {
    state.ruleProviders = parseRuleProviders(root['rule-providers'])
  }

  if (root.rules != null && Array.isArray(root.rules)) {
    const rules = root.rules as string[]
    const rulesGeosite = new Map<string, { action: string; target: string }>()
    const rulesGeoip = new Map<string, { action: string; target: string }>()
    const manualRules: ManualRule[] = []
    const ruleOrder: RuleEntry[] = []
    let matchPolicy = 'DIRECT'

    for (const line of rules) {
      if (typeof line !== 'string') continue
      const entry = parseRuleLine(line)
      if (!entry) continue

      if ('kind' in entry) {
        if (entry.kind === 'MATCH') {
          matchPolicy = entry.policy
          ruleOrder.push({ kind: 'MATCH', key: 'MATCH', policy: entry.policy })
          continue
        }
        if (entry.kind === 'GEOSITE') {
          rulesGeosite.set(entry.key, {
            action: entry.policy === 'REJECT' ? 'BLOCK' : 'PROXY',
            target: entry.policy,
          })
          ruleOrder.push(entry)
          continue
        }
        if (entry.kind === 'GEOIP') {
          rulesGeoip.set(entry.key, {
            action: entry.policy === 'REJECT' ? 'BLOCK' : 'PROXY',
            target: entry.policy,
          })
          ruleOrder.push(entry)
          continue
        }
        if (entry.kind === 'RULE-SET') {
          const rp = state.ruleProviders?.find((x) => x.name === entry.key)
          if (rp) rp.policy = entry.policy
          ruleOrder.push(entry)
          continue
        }
        ruleOrder.push(entry)
        continue
      }

      manualRules.push(entry)
      ruleOrder.push({
        kind: 'MANUAL',
        key: `${entry.type},${entry.value}`,
        policy: entry.policy,
      })
    }

    state.rulesGeosite = rulesGeosite
    state.rulesGeoip = rulesGeoip
    state.manualRules = manualRules
    state.ruleOrder = ruleOrder
    state.match = matchStateFromPolicy(matchPolicy, groupNames)

    for (const rp of state.ruleProviders ?? []) {
      if (rp.policy) continue
      const last = ruleOrder.filter((e) => e.kind === 'RULE-SET' && e.key === rp.name).pop()
      if (last) rp.policy = last.policy
    }
  }

  return { state, errors }
}
