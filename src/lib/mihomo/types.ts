/** Proxy object as produced by parser (VLESS, VMess, SS, Trojan, etc.) */
export interface MihomoProxy {
  name?: string
  type: string
  server: string
  port?: number
  uuid?: string
  password?: string
  cipher?: string
  alterId?: number
  network?: string
  flow?: string
  servername?: string
  'client-fingerprint'?: string
  sni?: string
  auth_str?: string
  auth?: string
  token?: string
  protocol?: string
  obfs?: string
  'protocol-param'?: string
  'obfs-param'?: string
  encryption?: string
  tls?: boolean
  udp?: boolean
  insecure?: boolean
  'skip-cert-verify'?: boolean
  'up-mbps'?: number
  'down-mbps'?: number
  alpn?: string[]
  seed?: string
  header?: string
  plugin?: string
  'plugin-opts'?: Record<string, string>
  'ws-opts'?: { path?: string; headers?: Record<string, string> }
  'reality-opts'?: Record<string, string>
  'grpc-opts'?: Record<string, string>
  'h2-opts'?: { path?: string; host?: string | string[] }
  'http-opts'?: { path?: string | string[]; headers?: Record<string, string | string[]> }
  'kcp-opts'?: { seed?: string; header?: { type: string } }
  'tcp-opts'?: { header?: { type: string } }
  [key: string]: unknown
}

export type ProxyGroupType = 'select' | 'url-test' | 'fallback' | 'load-balance'

export interface ProxyGroup {
  name: string
  type: ProxyGroupType
  icon?: string
  proxies: string[]
  manual: string[]
  useSubs?: string[]
  /** regex: include only proxies matching name */
  filter?: string
  /** regex: exclude proxies matching name */
  excludeFilter?: string
  /** exclude by protocol type (ss|trojan|vless|vmess|...) */
  excludeType?: string
  /** health-check URL */
  url?: string
  /** health-check interval (seconds) */
  interval?: number
  /** url-test: tolerance for ping difference */
  tolerance?: number
  /** lazy health check */
  lazy?: boolean
  /** expected HTTP status for health check */
  expectedStatus?: string
  /** include-all: true */
  includeAll?: boolean
  /** hidden from mihomo UI */
  hidden?: boolean
}

export interface Subscription {
  name: string
  url: string
  interval?: number
  fetchMode: 'DIRECT' | 'PROXY'
  fetchProxy?: string
  skipCertVerify?: boolean
}

export interface RuleProvider {
  name: string
  type?: string
  url: string
  path?: string
  interval?: number
  proxy?: string
  behavior?: string
  format?: string
  policy?: string
}

/** Rule-provider entry inside a service template (loaded from JSON) */
export interface ServiceTemplateRuleProvider {
  name: string
  behavior: string
  format: string
  url: string
}

/**
 * Service template: pre-defined rule-providers + rule pattern for one service (Telegram, YouTube, etc.).
 * Loaded from public/data/service-templates.json. {policy} in rulePattern is replaced with selected policy.
 */
export interface ServiceTemplate {
  id: string
  name: string
  icon?: string
  ruleProviders: ServiceTemplateRuleProvider[]
  rulePattern: string
}

export type ManualRuleType =
  | 'DOMAIN-SUFFIX'
  | 'DOMAIN-KEYWORD'
  | 'IP-CIDR'
  | 'IP-ASN'
  | 'PROCESS-NAME'
  | 'PROCESS-PATH'
  | 'IN-NAME'
  | 'IN-PORT'
  | 'IN-TYPE'
  | 'IN-USER'

/** Global/general config settings (mode, ports, allow-lan, etc.) */
export interface GeneralSettings {
  mode: 'rule' | 'global' | 'direct'
  mixedPort?: number
  port?: number
  socksPort?: number
  redirPort?: number
  tproxyPort?: number
  bindAddress?: string
  allowLan: boolean
  ipv6: boolean
  logLevel: 'silent' | 'error' | 'warning' | 'info' | 'debug'
  externalController?: string
  secret?: string
  unifiedDelay: boolean
  geodataMode: boolean
  tcpConcurrent: boolean
  findProcessMode?: 'strict' | 'always' | 'off'
  globalClientFingerprint?: string
}

/** DNS section of mihomo config */
export interface DnsSettings {
  enable: boolean
  listen?: string
  enhancedMode: 'fake-ip' | 'redir-host'
  fakeIpRange?: string
  fakeIpFilterMode?: 'blacklist' | 'whitelist'
  fakeIpFilter: string[]
  ipv6: boolean
  useHosts: boolean
  useSystemHosts: boolean
  cacheAlgorithm?: 'arc' | 'lru'
  defaultNameserver: string[]
  nameserver: string[]
  fallback: string[]
  fallbackFilter?: {
    geoip: boolean
    geoipCode?: string
    geosite?: string[]
    ipcidr?: string[]
    domain?: string[]
  }
  nameserverPolicy: Array<{ pattern: string; servers: string[] }>
  proxyServerNameserver: string[]
}

export type ListenerType =
  | 'http'
  | 'socks'
  | 'mixed'
  | 'redirect'
  | 'tproxy'
  | 'tun'
  | 'shadowsocks'
  | 'vmess'
  | 'vless'
  | 'trojan'
  | 'tuic'
  | 'hysteria2'
  | 'tunnel'

/** Inbound listener (listeners section) */
export interface Listener {
  name: string
  type: ListenerType
  port: number
  listen: string
  udp?: boolean
  /** Sub-rule name for this listener */
  rule?: string
  /** Direct proxy/group output (bypasses rules) */
  proxy?: string
  /** Type-specific fields (shadowsocks cipher/password, vmess uuid, etc.) */
  extraFields?: Record<string, unknown>
}

export interface ManualRule {
  type: ManualRuleType
  value: string
  policy: string
}

export type RuleEntryKind =
  | 'GEOSITE'
  | 'GEOIP'
  | 'RULE-SET'
  | 'MANUAL'
  | 'MATCH'
  | 'TEMPLATE'

export interface RuleEntry {
  kind: RuleEntryKind
  key: string
  policy: string
  /** For MANUAL: full rule line key (e.g. "DOMAIN-SUFFIX,example.com") */
  pretty?: string
}

export type MatchMode = 'auto' | 'builtin' | 'group'

export interface MatchState {
  mode: MatchMode
  value: string
}

/**
 * Full state of the Mihomo config generator.
 * Flow: linksRaw → (BUILD_PROXIES) → proxies; subs/groups define proxy-groups;
 * rulesGeosite/rulesGeoip/ruleProviders/manualRules + enabledTemplates → rules; MATCH = default policy.
 */
export interface MihomoState {
  /** Parsed proxy nodes from links (VLESS, VMess, SS, etc.) + extra (e.g. from Amnezia WG .conf) */
  proxies: MihomoProxy[]
  /** Proxies added from files (Amnezia/WireGuard .conf); merged into proxies on BUILD_PROXIES */
  extraProxies: MihomoProxy[]
  /** Proxy groups (select, url-test, fallback) — which proxies to use for which traffic */
  groups: ProxyGroup[]
  /** GEOSITE category names (loaded from remote list) */
  geosite: string[]
  /** GEOIP country/code names (loaded from remote list) */
  geoip: string[]
  /** Selected GEOSITE rules: category name → { action, target policy } */
  rulesGeosite: Map<string, { action: string; target: string }>
  /** Selected GEOIP rules: code → { action, target policy } */
  rulesGeoip: Map<string, { action: string; target: string }>
  /** Proxy-provider subscriptions (URLs that fetch proxy lists) */
  subs: Subscription[]
  /** Default policy for MATCH (traffic that didn't match any rule) */
  match: MatchState
  /** RULE-SET rule-providers (external domain/IP lists) */
  ruleProviders: RuleProvider[]
  /** User-added DOMAIN/IP/PROCESS rules */
  manualRules: ManualRule[]
  /** Order of rules in the generated config (user can reorder) */
  ruleOrder: RuleEntry[]
  /** Raw input links text (textarea) */
  linksRaw: string
  advancedSubsYaml: string
  advancedGroupsYaml: string
  advancedRulesYaml: string
  useAdvancedSubsYaml: boolean
  useAdvancedGroupsYaml: boolean
  useAdvancedRulesYaml: boolean
  /** Loaded from data/service-templates.json (Telegram, YouTube, etc.) */
  serviceTemplates: ServiceTemplate[]
  /** Template id → policy name when template is enabled */
  enabledTemplates: Map<string, string>
  /** Global settings (mode, ports, allow-lan, etc.) */
  generalSettings: GeneralSettings
  /** DNS section */
  dnsSettings: DnsSettings
  /** Inbound listeners */
  listeners: Listener[]
  /** Include general settings in generated YAML */
  useGeneralSettings: boolean
  /** Include DNS section in generated YAML */
  useDnsSettings: boolean
  /** Raw DNS YAML override */
  advancedDnsYaml: string
  useAdvancedDnsYaml: boolean
  /** Raw listeners YAML override */
  advancedListenersYaml: string
  useAdvancedListenersYaml: boolean
  /** Include listeners section in generated YAML */
  useListeners: boolean
}
