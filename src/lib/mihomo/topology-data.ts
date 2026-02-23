import type { MihomoState, RuleEntry } from './types'
import { buildRuleEntriesArray } from './state-helpers'

export interface SankeyNode {
  name: string
  /** Optional: 0 = kind, 1 = rule key, 2 = policy */
  depth?: number
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface TopologyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface BuildTopologyOptions {
  /** Expand policy groups into sub-groups and providers (chain view) */
  expandChains?: boolean
}

const MAX_CHAIN_DEPTH = 4
const CHAIN_PREFIXES = ['⟩ ', '⟩⟩ ', '⟩⟩⟩ ', '⟩⟩⟩⟩ '] as const

function depthPrefix(depth: number): string {
  return CHAIN_PREFIXES[Math.min(depth - 1, CHAIN_PREFIXES.length - 1)] ?? ''
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Build effective rule entries: ruleOrder (or built array) plus TEMPLATE entries for enabled service templates.
 */
function getEffectiveRuleEntries(state: MihomoState): RuleEntry[] {
  const base =
    state.ruleOrder.length > 0
      ? state.ruleOrder
      : buildRuleEntriesArray(state)

  const templateEntries: RuleEntry[] = []
  for (const tpl of state.serviceTemplates) {
    const policy = state.enabledTemplates.get(tpl.id)
    if (!policy) continue
    templateEntries.push({
      kind: 'TEMPLATE',
      key: tpl.name,
      policy,
    })
  }

  return [...base, ...templateEntries]
}

/** Prefixes to make node names unique per level and avoid cycles (Sankey requires DAG). */
const PREFIX_KIND = ''
const PREFIX_KEY = '▸ '
const PREFIX_POLICY = '→ '

/**
 * Convert MihomoState to ECharts Sankey format: nodes and links.
 * Levels: Kind (GEOSITE/GEOIP/...) -> Rule key -> Policy.
 * If expandChains is true, policy groups are expanded into sub-groups and providers (up to MAX_CHAIN_DEPTH).
 */
export function buildTopologyData(
  state: MihomoState,
  options: BuildTopologyOptions = {}
): TopologyData {
  const { expandChains = false } = options
  const entries = getEffectiveRuleEntries(state)
  const nodeSet = new Set<string>()
  const linkMap = new Map<string, number>()

  const groupNames = new Set(state.groups.map((g) => g.name))
  const groupByName = new Map(state.groups.map((g) => [g.name, g]))

  function addGroupChain(parentNodeName: string, groupName: string, depth: number): void {
    if (depth > MAX_CHAIN_DEPTH) return
    const g = groupByName.get(groupName)
    if (!g) return
    const children = uniq([
      ...(g.proxies ?? []),
      ...(g.manual ?? []),
      ...(g.useSubs ?? []),
    ])
    const prefix = depthPrefix(depth)
    for (const child of children) {
      const childNodeName = prefix + child
      nodeSet.add(childNodeName)
      const linkKey = `${parentNodeName}\0${childNodeName}`
      linkMap.set(linkKey, (linkMap.get(linkKey) ?? 0) + 1)
      if (groupNames.has(child) && depth < MAX_CHAIN_DEPTH) {
        addGroupChain(childNodeName, child, depth + 1)
      }
    }
  }

  for (const e of entries) {
    const kindNode = PREFIX_KIND + e.kind
    const keyNode = PREFIX_KEY + e.key
    const policyNode = PREFIX_POLICY + e.policy

    nodeSet.add(kindNode)
    nodeSet.add(keyNode)
    nodeSet.add(policyNode)

    const link1Key = `${kindNode}\0${keyNode}`
    linkMap.set(link1Key, (linkMap.get(link1Key) ?? 0) + 1)
    const link2Key = `${keyNode}\0${policyNode}`
    linkMap.set(link2Key, (linkMap.get(link2Key) ?? 0) + 1)

    if (expandChains && groupNames.has(e.policy)) {
      addGroupChain(policyNode, e.policy, 1)
    }
  }

  const nodes: SankeyNode[] = Array.from(nodeSet).map((name) => ({ name }))
  const links: SankeyLink[] = []
  for (const [linkKey, value] of linkMap) {
    const [source, target] = linkKey.split('\0')
    links.push({ source, target, value })
  }

  return { nodes, links }
}
