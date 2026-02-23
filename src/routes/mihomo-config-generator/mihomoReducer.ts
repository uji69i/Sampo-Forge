import { parseMany } from '@/lib/mihomo/parser'
import {
  ensureAutoProxyGroup,
  resolveProxyNameConflicts,
  buildRuleEntriesArray,
} from '@/lib/mihomo/state-helpers'
import type {
  MihomoState,
  MihomoProxy,
  ProxyGroup,
  Subscription,
  RuleProvider,
  ManualRule,
  RuleEntry,
  MatchState,
  ServiceTemplate,
  GeneralSettings,
  DnsSettings,
  Listener,
} from '@/lib/mihomo/types'

const defaultGeneralSettings: GeneralSettings = {
  mode: 'rule',
  allowLan: false,
  ipv6: false,
  logLevel: 'info',
  unifiedDelay: true,
  geodataMode: false,
  tcpConcurrent: false,
}

const defaultDnsSettings: DnsSettings = {
  enable: false,
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

/** Initial state for the Mihomo config generator (no proxies, no rules). */
export function createInitialState(): MihomoState {
  return {
    proxies: [],
    extraProxies: [],
    groups: [],
    geosite: [],
    geoip: [],
    rulesGeosite: new Map(),
    rulesGeoip: new Map(),
    subs: [],
    match: { mode: 'auto', value: '' },
    ruleProviders: [],
    manualRules: [],
    ruleOrder: [],
    linksRaw: '',
    advancedSubsYaml: '',
    advancedGroupsYaml: '',
    advancedRulesYaml: '',
    useAdvancedSubsYaml: false,
    useAdvancedGroupsYaml: false,
    useAdvancedRulesYaml: false,
    serviceTemplates: [],
    enabledTemplates: new Map(),
    generalSettings: defaultGeneralSettings,
    dnsSettings: defaultDnsSettings,
    listeners: [],
    useGeneralSettings: false,
    useDnsSettings: false,
    advancedDnsYaml: '',
    useAdvancedDnsYaml: false,
    advancedListenersYaml: '',
    useAdvancedListenersYaml: false,
    useListeners: false,
  }
}

/** Actions: SET_LINKS_RAW/BUILD_PROXIES (input), ADD_SUB/ADD_GROUP (sources & groups), SET_*_POLICY/MOVE_RULE (rules), TOGGLE_TEMPLATE (service templates). */
export type MihomoAction =
  | { type: 'SET_LINKS_RAW'; payload: string }
  | { type: 'BUILD_PROXIES' }
  | { type: 'SET_SUBS'; payload: Subscription[] }
  | { type: 'ADD_SUB'; payload: Subscription }
  | { type: 'REMOVE_SUB'; payload: number }
  | { type: 'UPDATE_SUB'; payload: { index: number; sub: Partial<Subscription> } }
  | { type: 'SET_GROUPS'; payload: ProxyGroup[] }
  | { type: 'ADD_GROUP'; payload: ProxyGroup }
  | { type: 'UPDATE_GROUP'; payload: { index: number; group: Partial<ProxyGroup> } }
  | { type: 'REMOVE_GROUP'; payload: number }
  | { type: 'SET_GEOSITE'; payload: string[] }
  | { type: 'SET_GEOIP'; payload: string[] }
  | { type: 'SET_RULES_GEOSITE'; payload: Map<string, { action: string; target: string }> }
  | { type: 'SET_RULES_GEOIP'; payload: Map<string, { action: string; target: string }> }
  | { type: 'SET_GEOSITE_POLICY'; payload: { name: string; target: string } }
  | { type: 'SET_GEOIP_POLICY'; payload: { code: string; target: string } }
  | { type: 'SET_MATCH'; payload: MatchState }
  | { type: 'SET_RULE_PROVIDERS'; payload: RuleProvider[] }
  | { type: 'ADD_RULE_PROVIDER'; payload: RuleProvider }
  | { type: 'REMOVE_RULE_PROVIDER'; payload: number }
  | { type: 'ADD_MANUAL_RULE'; payload: ManualRule }
  | { type: 'REMOVE_MANUAL_RULE'; payload: number }
  | { type: 'SET_RULE_ORDER'; payload: RuleEntry[] }
  | { type: 'MOVE_RULE'; payload: { index: number; direction: 'up' | 'down' | 'top' | 'bottom' } }
  | { type: 'REBUILD_RULE_ORDER' }
  | { type: 'SET_ADVANCED_SUBS_YAML'; payload: string }
  | { type: 'SET_ADVANCED_GROUPS_YAML'; payload: string }
  | { type: 'SET_ADVANCED_RULES_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_SUBS'; payload: boolean }
  | { type: 'SET_USE_ADVANCED_GROUPS'; payload: boolean }
  | { type: 'SET_USE_ADVANCED_RULES'; payload: boolean }
  | { type: 'SET_SERVICE_TEMPLATES'; payload: ServiceTemplate[] }
  | { type: 'TOGGLE_TEMPLATE'; payload: { id: string; policy: string } }
  | { type: 'SET_TEMPLATE_POLICY'; payload: { id: string; policy: string } }
  | { type: 'SET_GENERAL_SETTINGS'; payload: Partial<GeneralSettings> }
  | { type: 'SET_USE_GENERAL_SETTINGS'; payload: boolean }
  | { type: 'SET_DNS_SETTINGS'; payload: Partial<DnsSettings> }
  | { type: 'SET_USE_DNS_SETTINGS'; payload: boolean }
  | { type: 'SET_ADVANCED_DNS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_DNS'; payload: boolean }
  | { type: 'ADD_LISTENER'; payload: { listener: Listener; autoBind?: boolean } }
  | { type: 'UPDATE_LISTENER'; payload: { index: number; listener: Partial<Listener> } }
  | { type: 'REMOVE_LISTENER'; payload: number }
  | { type: 'SET_ADVANCED_LISTENERS_YAML'; payload: string }
  | { type: 'SET_USE_ADVANCED_LISTENERS'; payload: boolean }
  | { type: 'SET_USE_LISTENERS'; payload: boolean }
  | { type: 'IMPORT_YAML'; payload: Partial<MihomoState> }
  | { type: 'IMPORT_SERIALIZED'; payload: Partial<MihomoState> }
  | { type: 'ADD_EXTRA_PROXIES'; payload: MihomoProxy[] }
  | { type: 'CLEAR_EXTRA_PROXIES' }

function cloneMap<K, V>(m: Map<K, V>): Map<K, V> {
  return new Map(m)
}

/** Reducer: BUILD_PROXIES parses links and ensures auto group; REBUILD_RULE_ORDER merges new rules with user order; template actions update enabledTemplates. */
export function mihomoReducer(state: MihomoState, action: MihomoAction): MihomoState {
  switch (action.type) {
    case 'SET_LINKS_RAW':
      return { ...state, linksRaw: action.payload }
    case 'BUILD_PROXIES': {
      const { proxies: fromLinks } = parseMany(state.linksRaw, { collectErrors: true })
      const proxies = [...fromLinks, ...state.extraProxies]
      const groups = [...state.groups]
      resolveProxyNameConflicts(proxies, groups)
      const next: MihomoState = {
        ...state,
        proxies,
        groups,
      }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'ADD_EXTRA_PROXIES':
      return {
        ...state,
        extraProxies: [...state.extraProxies, ...action.payload],
      }
    case 'CLEAR_EXTRA_PROXIES':
      return { ...state, extraProxies: [] }
    case 'SET_SUBS':
      return { ...state, subs: action.payload }
    case 'ADD_SUB': {
      const subs = [...state.subs, action.payload]
      const next = { ...state, subs }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'REMOVE_SUB': {
      const subs = state.subs.filter((_, i) => i !== action.payload)
      const next = { ...state, subs }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'UPDATE_SUB': {
      const { index, sub } = action.payload
      const subs = state.subs.map((s, i) =>
        i === index ? { ...s, ...sub } : s
      )
      return { ...state, subs }
    }
    case 'SET_GROUPS':
      return { ...state, groups: action.payload }
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.payload] }
    case 'UPDATE_GROUP': {
      const { index, group } = action.payload
      const groups = state.groups.map((g, i) =>
        i === index ? { ...g, ...group } : g
      )
      return { ...state, groups }
    }
    case 'REMOVE_GROUP': {
      const groups = state.groups.filter((_, i) => i !== action.payload)
      return { ...state, groups }
    }
    case 'SET_GEOSITE':
      return { ...state, geosite: action.payload }
    case 'SET_GEOIP':
      return { ...state, geoip: action.payload }
    case 'SET_RULES_GEOSITE':
      return { ...state, rulesGeosite: cloneMap(action.payload) }
    case 'SET_RULES_GEOIP':
      return { ...state, rulesGeoip: cloneMap(action.payload) }
    case 'SET_GEOSITE_POLICY': {
      const rulesGeosite = cloneMap(state.rulesGeosite)
      rulesGeosite.set(action.payload.name, {
        action: action.payload.target === 'REJECT' ? 'BLOCK' : 'PROXY',
        target: action.payload.target,
      })
      return { ...state, rulesGeosite }
    }
    case 'SET_GEOIP_POLICY': {
      const rulesGeoip = cloneMap(state.rulesGeoip)
      rulesGeoip.set(action.payload.code, {
        action: action.payload.target === 'REJECT' ? 'BLOCK' : 'PROXY',
        target: action.payload.target,
      })
      return { ...state, rulesGeoip }
    }
    case 'SET_MATCH':
      return { ...state, match: action.payload }
    case 'SET_RULE_PROVIDERS':
      return { ...state, ruleProviders: action.payload }
    case 'ADD_RULE_PROVIDER':
      return {
        ...state,
        ruleProviders: [...state.ruleProviders, action.payload],
      }
    case 'REMOVE_RULE_PROVIDER': {
      const ruleProviders = state.ruleProviders.filter(
        (_, i) => i !== action.payload
      )
      return { ...state, ruleProviders }
    }
    case 'ADD_MANUAL_RULE':
      return {
        ...state,
        manualRules: [...state.manualRules, action.payload],
      }
    case 'REMOVE_MANUAL_RULE': {
      const manualRules = state.manualRules.filter(
        (_, i) => i !== action.payload
      )
      return { ...state, manualRules }
    }
    case 'SET_RULE_ORDER':
      return { ...state, ruleOrder: action.payload }
    case 'MOVE_RULE': {
      const { index, direction } = action.payload
      const entries = [...state.ruleOrder]
      const matchIdx = entries.findIndex((e) => e.kind === 'MATCH')
      const lastIdx = matchIdx >= 0 ? matchIdx : entries.length
      const movable = entries.filter((_, i) => i !== lastIdx)
      const matchEntry = matchIdx >= 0 ? entries[matchIdx] : null
      if (index < 0 || index >= movable.length) return state
      const from = index
      let to = from
      if (direction === 'up') to = Math.max(0, from - 1)
      else if (direction === 'down') to = Math.min(movable.length - 1, from + 1)
      else if (direction === 'top') to = 0
      else if (direction === 'bottom') to = movable.length - 1
      if (from === to) return state
      const [removed] = movable.splice(from, 1)
      movable.splice(to, 0, removed)
      const ruleOrder = matchEntry ? [...movable, matchEntry] : movable
      return { ...state, ruleOrder }
    }
    case 'REBUILD_RULE_ORDER': {
      const raw = buildRuleEntriesArray(state)
      const matchEntry = raw.find((e) => e.kind === 'MATCH') ?? null
      const nonMatch = raw.filter((e) => e.kind !== 'MATCH')
      const byKey = new Map(
        nonMatch.map((e) => [
          e.kind + ':' + (e.kind === 'MANUAL' ? e.key : e.key),
          e,
        ])
      )
      const prev = state.ruleOrder.filter((e) => e.kind !== 'MATCH')
      const next: RuleEntry[] = []
      for (const old of prev) {
        const key = old.kind + ':' + (old.kind === 'MANUAL' ? old.key : old.key)
        const fresh = byKey.get(key)
        if (fresh) {
          next.push(fresh)
          byKey.delete(key)
        }
      }
      for (const e of byKey.values()) next.push(e)
      if (matchEntry) next.push(matchEntry)
      return { ...state, ruleOrder: next }
    }
    case 'SET_ADVANCED_SUBS_YAML':
      return { ...state, advancedSubsYaml: action.payload }
    case 'SET_ADVANCED_GROUPS_YAML':
      return { ...state, advancedGroupsYaml: action.payload }
    case 'SET_ADVANCED_RULES_YAML':
      return { ...state, advancedRulesYaml: action.payload }
    case 'SET_USE_ADVANCED_SUBS':
      return { ...state, useAdvancedSubsYaml: action.payload }
    case 'SET_USE_ADVANCED_GROUPS':
      return { ...state, useAdvancedGroupsYaml: action.payload }
    case 'SET_USE_ADVANCED_RULES':
      return { ...state, useAdvancedRulesYaml: action.payload }
    case 'SET_SERVICE_TEMPLATES':
      return { ...state, serviceTemplates: action.payload }
    case 'TOGGLE_TEMPLATE': {
      const { id, policy } = action.payload
      const enabled = new Map(state.enabledTemplates)
      if (enabled.has(id)) enabled.delete(id)
      else enabled.set(id, policy)
      return { ...state, enabledTemplates: enabled }
    }
    case 'SET_TEMPLATE_POLICY': {
      const { id, policy } = action.payload
      const enabled = new Map(state.enabledTemplates)
      if (enabled.has(id)) enabled.set(id, policy)
      return { ...state, enabledTemplates: enabled }
    }
    case 'SET_GENERAL_SETTINGS':
      return {
        ...state,
        generalSettings: { ...state.generalSettings, ...action.payload },
      }
    case 'SET_USE_GENERAL_SETTINGS':
      return { ...state, useGeneralSettings: action.payload }
    case 'SET_DNS_SETTINGS':
      return {
        ...state,
        dnsSettings: { ...state.dnsSettings, ...action.payload },
      }
    case 'SET_USE_DNS_SETTINGS':
      return { ...state, useDnsSettings: action.payload }
    case 'SET_ADVANCED_DNS_YAML':
      return { ...state, advancedDnsYaml: action.payload }
    case 'SET_USE_ADVANCED_DNS':
      return { ...state, useAdvancedDnsYaml: action.payload }
    case 'ADD_LISTENER': {
      const { listener, autoBind } = action.payload
      const listeners = [...state.listeners, listener]
      let groups = state.groups
      let manualRules = state.manualRules
      if (autoBind) {
        const subNames = state.subs.map((s) => s.name)
        groups = [
          ...state.groups,
          {
            name: listener.name,
            type: 'select',
            proxies: [],
            manual: [],
            useSubs: subNames.length ? subNames : undefined,
          },
        ]
        manualRules = [
          ...state.manualRules,
          { type: 'IN-NAME', value: listener.name, policy: listener.name },
        ]
      }
      const next = {
        ...state,
        listeners,
        groups,
        manualRules,
      }
      ensureAutoProxyGroup(next)
      return next
    }
    case 'UPDATE_LISTENER': {
      const { index, listener: patch } = action.payload
      if (index < 0 || index >= state.listeners.length) return state
      const listeners = state.listeners.map((l, i) =>
        i === index ? { ...l, ...patch } : l
      )
      return { ...state, listeners }
    }
    case 'REMOVE_LISTENER': {
      const listeners = state.listeners.filter((_, i) => i !== action.payload)
      return { ...state, listeners }
    }
    case 'SET_ADVANCED_LISTENERS_YAML':
      return { ...state, advancedListenersYaml: action.payload }
    case 'SET_USE_ADVANCED_LISTENERS':
      return { ...state, useAdvancedListenersYaml: action.payload }
    case 'SET_USE_LISTENERS':
      return { ...state, useListeners: action.payload }
    case 'IMPORT_YAML': {
      const p = action.payload
      const next: MihomoState = {
        ...state,
        ...(p.proxies != null && { proxies: p.proxies }),
        ...(p.groups != null && { groups: p.groups }),
        ...(p.subs != null && { subs: p.subs }),
        ...(p.ruleProviders != null && { ruleProviders: p.ruleProviders }),
        ...(p.rulesGeosite != null && { rulesGeosite: cloneMap(p.rulesGeosite) }),
        ...(p.rulesGeoip != null && { rulesGeoip: cloneMap(p.rulesGeoip) }),
        ...(p.manualRules != null && { manualRules: p.manualRules }),
        ...(p.ruleOrder != null && { ruleOrder: p.ruleOrder }),
        ...(p.match != null && { match: p.match }),
        ...(p.enabledTemplates != null && { enabledTemplates: cloneMap(p.enabledTemplates) }),
        ...(p.advancedSubsYaml != null && { advancedSubsYaml: p.advancedSubsYaml }),
        ...(p.advancedGroupsYaml != null && { advancedGroupsYaml: p.advancedGroupsYaml }),
        ...(p.advancedRulesYaml != null && { advancedRulesYaml: p.advancedRulesYaml }),
        ...(p.useAdvancedSubsYaml != null && { useAdvancedSubsYaml: p.useAdvancedSubsYaml }),
        ...(p.useAdvancedGroupsYaml != null && { useAdvancedGroupsYaml: p.useAdvancedGroupsYaml }),
        ...(p.generalSettings != null && { generalSettings: p.generalSettings }),
        ...(p.dnsSettings != null && { dnsSettings: p.dnsSettings }),
        ...(p.listeners != null && { listeners: p.listeners }),
        ...(p.useGeneralSettings != null && { useGeneralSettings: p.useGeneralSettings }),
        ...(p.useDnsSettings != null && { useDnsSettings: p.useDnsSettings }),
        ...(p.advancedDnsYaml != null && { advancedDnsYaml: p.advancedDnsYaml }),
        ...(p.useAdvancedDnsYaml != null && { useAdvancedDnsYaml: p.useAdvancedDnsYaml }),
        ...(p.advancedListenersYaml != null && { advancedListenersYaml: p.advancedListenersYaml }),
        ...(p.useAdvancedListenersYaml != null && { useAdvancedListenersYaml: p.useAdvancedListenersYaml }),
        ...(p.useListeners != null && { useListeners: p.useListeners }),
        ...(p.extraProxies != null && { extraProxies: p.extraProxies }),
      }
      if (p.proxies != null && !p.linksRaw) next.extraProxies = []
      ensureAutoProxyGroup(next)
      return next
    }
    case 'IMPORT_SERIALIZED': {
      const p = action.payload
      const next: MihomoState = {
        ...state,
        ...(p.linksRaw != null && { linksRaw: p.linksRaw }),
        ...(p.subs != null && { subs: p.subs }),
        ...(p.groups != null && { groups: p.groups }),
        ...(p.match != null && { match: p.match }),
        ...(p.ruleProviders != null && { ruleProviders: p.ruleProviders }),
        ...(p.rulesGeosite != null && { rulesGeosite: cloneMap(p.rulesGeosite) }),
        ...(p.rulesGeoip != null && { rulesGeoip: cloneMap(p.rulesGeoip) }),
        ...(p.manualRules != null && { manualRules: p.manualRules }),
        ...(p.ruleOrder != null && { ruleOrder: p.ruleOrder }),
        ...(p.enabledTemplates != null && { enabledTemplates: cloneMap(p.enabledTemplates) }),
        ...(p.advancedSubsYaml != null && { advancedSubsYaml: p.advancedSubsYaml }),
        ...(p.advancedGroupsYaml != null && { advancedGroupsYaml: p.advancedGroupsYaml }),
        ...(p.advancedRulesYaml != null && { advancedRulesYaml: p.advancedRulesYaml }),
        ...(p.useAdvancedSubsYaml != null && { useAdvancedSubsYaml: p.useAdvancedSubsYaml }),
        ...(p.useAdvancedGroupsYaml != null && { useAdvancedGroupsYaml: p.useAdvancedGroupsYaml }),
        ...(p.generalSettings != null && { generalSettings: p.generalSettings }),
        ...(p.dnsSettings != null && { dnsSettings: p.dnsSettings }),
        ...(p.listeners != null && { listeners: p.listeners }),
        ...(p.useGeneralSettings != null && { useGeneralSettings: p.useGeneralSettings }),
        ...(p.useDnsSettings != null && { useDnsSettings: p.useDnsSettings }),
        ...(p.advancedDnsYaml != null && { advancedDnsYaml: p.advancedDnsYaml }),
        ...(p.useAdvancedDnsYaml != null && { useAdvancedDnsYaml: p.useAdvancedDnsYaml }),
        ...(p.advancedListenersYaml != null && { advancedListenersYaml: p.advancedListenersYaml }),
        ...(p.useAdvancedListenersYaml != null && { useAdvancedListenersYaml: p.useAdvancedListenersYaml }),
        ...(p.useListeners != null && { useListeners: p.useListeners }),
        ...(p.extraProxies != null && { extraProxies: p.extraProxies }),
      }
      if (p.linksRaw != null && p.linksRaw.trim()) {
        const { proxies: fromLinks } = parseMany(p.linksRaw, { collectErrors: true })
        const proxies = [...fromLinks, ...next.extraProxies]
        const groups = [...next.groups]
        resolveProxyNameConflicts(proxies, groups)
        next.proxies = proxies
        next.groups = groups
      } else if (p.proxies != null) {
        next.proxies = p.proxies
      }
      ensureAutoProxyGroup(next)
      return next
    }
    default:
      return state
  }
}
