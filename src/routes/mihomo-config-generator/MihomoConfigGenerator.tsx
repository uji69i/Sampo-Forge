import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { getDataBaseUrl } from '@/lib/dataBaseUrl'
import { GEOSITE_URL, GEOIP_URL, MATCH_POLICIES } from '@/lib/mihomo/constants'
import { parseMany } from '@/lib/mihomo/parser'
import { buildRuleEntriesArray } from '@/lib/mihomo/state-helpers'
import { serializeStateToUrl, deserializeStateFromUrl, MAX_URL_LENGTH } from '@/lib/mihomo/state-serializer'
import { createInitialState, mihomoReducer } from './mihomoReducer'
import { ProxyLinksInput } from './components/ProxyLinksInput'
import { Base64Import } from './components/Base64Import'
import { AmneziaWgImport } from './components/AmneziaWgImport'
import { Subscriptions } from './components/Subscriptions'
import { ProxyGroups } from './components/ProxyGroups'
import { GeoRules } from './components/GeoRules'
import { RuleProviders } from './components/RuleProviders'
import { ManualRules } from './components/ManualRules'
import { RuleOrder } from './components/RuleOrder'
import { YamlOutput } from './components/YamlOutput'
import { ImportConfigDialog } from './components/ImportConfigDialog'
import { ServiceTemplates } from './components/ServiceTemplates'
import { GeneralSettingsPanel } from './components/GeneralSettingsPanel'
import { DnsSettingsPanel } from './components/DnsSettingsPanel'
import { Listeners } from './components/Listeners'
import { ConfigTopology } from './components/ConfigTopology'
import { DemoPresets } from './components/DemoPresets'
import type { ServiceTemplate } from '@/lib/mihomo/types'
import type { DemoPresetMeta } from './components/DemoPresets'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Mihomo/Clash config generator. Data flow:
 * 1) Input (col 1): links + base64 → proxies; subscriptions → proxy-providers; service templates → rule-providers + rules.
 * 2) Processing (col 2): groups define which proxies to use; MATCH = default policy for remaining traffic.
 * 3) Output (col 3): rule-providers, GEOSITE/GEOIP, manual rules, order → rules block.
 * 4) Ready config (col 4): buildFullConfig() → YAML, copy/download.
 */
export function MihomoConfigGenerator() {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(mihomoReducer, createInitialState())
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [statusText, setStatusText] = useState('—')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [urlSecurityWarning, setUrlSecurityWarning] = useState(false)
  const [demoPresets, setDemoPresets] = useState<DemoPresetMeta[]>([])
  const urlImportDone = useRef(false)

  const isStateEmpty =
    !state.linksRaw.trim() &&
    !state.extraProxies.length &&
    !state.subs.length &&
    !state.groups.length &&
    state.enabledTemplates.size === 0 &&
    !state.ruleProviders.length &&
    !state.manualRules.length &&
    !state.listeners.length

  const groupNames = state.groups.map((g) => g.name).filter(Boolean)
  const listenerNames = state.listeners.map((l) => l.name).filter(Boolean)
  const policyOptions = [
    ...MATCH_POLICIES.map((p) => ({ value: p.value, label: p.value })),
    ...groupNames.map((n) => ({ value: n, label: n })),
    ...listenerNames.filter((n) => !groupNames.includes(n)).map((n) => ({ value: n, label: n })),
  ]

  const loadGeosite = useCallback(async () => {
    try {
      const res = await fetch(GEOSITE_URL)
      const text = await res.text()
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      dispatch({ type: 'SET_GEOSITE', payload: lines })
    } catch (e) {
      console.error('Load geosite failed', e)
    }
  }, [])

  const loadGeoip = useCallback(async () => {
    try {
      const res = await fetch(GEOIP_URL)
      const text = await res.text()
      const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      dispatch({ type: 'SET_GEOIP', payload: lines })
    } catch (e) {
      console.error('Load geoip failed', e)
    }
  }, [])

  const handleBuild = useCallback(() => {
    dispatch({ type: 'BUILD_PROXIES' })
    dispatch({ type: 'REBUILD_RULE_ORDER' })
    const { proxies: fromLinks } = parseMany(state.linksRaw, { collectErrors: true })
    const totalProxies = fromLinks.length + state.extraProxies.length
    if (totalProxies === 0 && !state.subs.length) {
      setStatus('error')
      setStatusText(t('mihomo.emptyStatus'))
      return
    }
    setStatus('ok')
    const parts: string[] = []
    if (totalProxies) parts.push(t('mihomo.countProxies', { count: totalProxies }))
    if (state.subs.length) parts.push(t('mihomo.countSubs', { count: state.subs.length }))
    if (state.groups.length) parts.push(t('mihomo.countGroups', { count: state.groups.length }))
    const ruleCount = state.rulesGeosite.size + state.rulesGeoip.size
    if (ruleCount) parts.push(t('mihomo.countRules', { count: ruleCount }))
    setStatusText(parts.length ? parts.join(', ') : t('mihomo.advancedOnly'))
  }, [state.linksRaw, state.extraProxies.length, state.subs.length, state.groups.length, state.rulesGeosite.size, state.rulesGeoip.size, t])

  const resetGeositeSelection = useCallback(() => {
    dispatch({ type: 'SET_RULES_GEOSITE', payload: new Map() })
  }, [])

  const resetGeoipSelection = useCallback(() => {
    dispatch({ type: 'SET_RULES_GEOIP', payload: new Map() })
  }, [])

  useEffect(() => {
    const url = `${getDataBaseUrl()}data/service-templates.json`
    fetch(url)
      .then((r) => r.json())
      .then((data: ServiceTemplate[]) => {
        if (Array.isArray(data)) dispatch({ type: 'SET_SERVICE_TEMPLATES', payload: data })
      })
      .catch((e) => console.warn('Load service templates failed', e))
  }, [])

  useEffect(() => {
    const url = `${getDataBaseUrl()}data/demo-presets/index.json`
    fetch(url)
      .then((r) => r.json())
      .then((data: DemoPresetMeta[]) => {
        if (Array.isArray(data)) setDemoPresets(data)
      })
      .catch((e) => console.warn('Load demo presets index failed', e))
  }, [])

  useEffect(() => {
    if (urlImportDone.current) return
    const params = new URLSearchParams(window.location.search)
    const configParam = params.get('config')
    if (!configParam) return
    urlImportDone.current = true
    const payload = deserializeStateFromUrl(configParam)
    if (payload) {
      dispatch({ type: 'IMPORT_SERIALIZED', payload })
      queueMicrotask(() => setUrlSecurityWarning(true))
    }
    params.delete('config')
    const newSearch = params.toString()
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
    window.history.replaceState(null, '', newUrl)
  }, [])

  const handleShare = useCallback(async () => {
    const encoded = serializeStateToUrl(state)
    const base = window.location.origin + window.location.pathname
    const shareUrl = base + (encoded ? '?config=' + encoded : '')
    if (shareUrl.length > MAX_URL_LENGTH) {
      const msg = t('mihomo.shareUrlTooLong')
      await navigator.clipboard.writeText(msg)
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // ignore
    }
  }, [state, t])

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('mihomo.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('mihomo.subtitle')}</p>

      {urlSecurityWarning && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10" role="alert">
          <AlertDescription>{t('mihomo.urlSecurityWarning')}</AlertDescription>
        </Alert>
      )}

      <DemoPresets
        presets={demoPresets}
        isStateEmpty={isStateEmpty}
        dispatch={dispatch}
      />

      <section className="mb-6 space-y-4">
        <GeneralSettingsPanel
          settings={state.generalSettings}
          useGeneralSettings={state.useGeneralSettings}
          onSettingsChange={(patch) => dispatch({ type: 'SET_GENERAL_SETTINGS', payload: patch })}
          onUseToggle={(v) => dispatch({ type: 'SET_USE_GENERAL_SETTINGS', payload: v })}
        />
        <DnsSettingsPanel
          settings={state.dnsSettings}
          useDnsSettings={state.useDnsSettings}
          advancedDnsYaml={state.advancedDnsYaml}
          useAdvancedDnsYaml={state.useAdvancedDnsYaml}
          onSettingsChange={(patch) => dispatch({ type: 'SET_DNS_SETTINGS', payload: patch })}
          onUseToggle={(v) => dispatch({ type: 'SET_USE_DNS_SETTINGS', payload: v })}
          onAdvancedYamlChange={(v) => dispatch({ type: 'SET_ADVANCED_DNS_YAML', payload: v })}
          onAdvancedToggle={(v) => dispatch({ type: 'SET_USE_ADVANCED_DNS', payload: v })}
        />
        <Listeners
          listeners={state.listeners}
          useListeners={state.useListeners}
          useAdvancedListenersYaml={state.useAdvancedListenersYaml}
          advancedListenersYaml={state.advancedListenersYaml}
          policyOptions={policyOptions}
          onUseToggle={(v) => dispatch({ type: 'SET_USE_LISTENERS', payload: v })}
          onAddListener={(listener, autoBind) =>
            dispatch({ type: 'ADD_LISTENER', payload: { listener, autoBind } })
          }
          onUpdateListener={(index, patch) =>
            dispatch({ type: 'UPDATE_LISTENER', payload: { index, listener: patch } })
          }
          onRemoveListener={(i) => dispatch({ type: 'REMOVE_LISTENER', payload: i })}
          onAdvancedYamlChange={(v) =>
            dispatch({ type: 'SET_ADVANCED_LISTENERS_YAML', payload: v })
          }
          onAdvancedToggle={(v) =>
            dispatch({ type: 'SET_USE_ADVANCED_LISTENERS', payload: v })
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Column 1: Input — proxy links, base64, subscriptions */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('mihomo.columnInput')}</h2>
          <div className="space-y-4">
            <ProxyLinksInput
              value={state.linksRaw}
              onChange={(v) => dispatch({ type: 'SET_LINKS_RAW', payload: v })}
              onBuild={handleBuild}
            />
            <Base64Import
              onLinksAppend={(links) => {
                const current = state.linksRaw
                const sep = current && !current.endsWith('\n') ? '\n' : ''
                dispatch({ type: 'SET_LINKS_RAW', payload: current + sep + links })
              }}
            />
            <AmneziaWgImport
              onAddProxies={(proxies) => dispatch({ type: 'ADD_EXTRA_PROXIES', payload: proxies })}
              onBuild={() => {
                dispatch({ type: 'BUILD_PROXIES' })
                dispatch({ type: 'REBUILD_RULE_ORDER' })
              }}
            />
            <Subscriptions
              subs={state.subs}
              advancedYaml={state.advancedSubsYaml}
              advancedEnabled={state.useAdvancedSubsYaml}
              onAddSub={(sub) => dispatch({ type: 'ADD_SUB', payload: sub })}
              onRemoveSub={(i) => dispatch({ type: 'REMOVE_SUB', payload: i })}
              onAdvancedYamlChange={(v) =>
                dispatch({ type: 'SET_ADVANCED_SUBS_YAML', payload: v })
              }
              onAdvancedToggle={(v) =>
                dispatch({ type: 'SET_USE_ADVANCED_SUBS', payload: v })
              }
              groupNames={groupNames}
            />
            <ServiceTemplates
              templates={state.serviceTemplates}
              enabledTemplates={state.enabledTemplates}
              policyOptions={policyOptions}
              onToggle={(id, policy) =>
                dispatch({ type: 'TOGGLE_TEMPLATE', payload: { id, policy } })
              }
              onPolicyChange={(id, policy) =>
                dispatch({ type: 'SET_TEMPLATE_POLICY', payload: { id, policy } })
              }
            />
          </div>
        </div>

        {/* Column 2: Processing — proxy groups, MATCH policy */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('mihomo.columnProcessing')}</h2>
          <div className="space-y-4">
            <ProxyGroups
              groups={state.groups}
              proxyNames={state.proxies.map((p) => p.name).filter(Boolean) as string[]}
              onAddGroup={(g) => dispatch({ type: 'ADD_GROUP', payload: g })}
              onUpdateGroup={(i, patch) =>
                dispatch({ type: 'UPDATE_GROUP', payload: { index: i, group: patch } })
              }
              onRemoveGroup={(i) => dispatch({ type: 'REMOVE_GROUP', payload: i })}
              advancedYaml={state.advancedGroupsYaml}
              advancedEnabled={state.useAdvancedGroupsYaml}
              onAdvancedYamlChange={(v) =>
                dispatch({ type: 'SET_ADVANCED_GROUPS_YAML', payload: v })
              }
              onAdvancedToggle={(v) =>
                dispatch({ type: 'SET_USE_ADVANCED_GROUPS', payload: v })
              }
            />
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                <div>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">MATCH</span>
                  <CardTitle className="text-sm">{t('mihomo.matchTitle')}</CardTitle>
                </div>
                <Select
                  value={state.match.mode === 'builtin' || state.match.mode === 'group' ? state.match.value : 'auto'}
                  onValueChange={(v) => {
                    if (v === 'DIRECT' || v === 'REJECT')
                      dispatch({ type: 'SET_MATCH', payload: { mode: 'builtin', value: v } })
                    else if (groupNames.includes(v))
                      dispatch({ type: 'SET_MATCH', payload: { mode: 'group', value: v } })
                    else
                      dispatch({ type: 'SET_MATCH', payload: { mode: 'auto', value: '' } })
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('mihomo.matchPolicyAuto')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('mihomo.matchPolicyAuto')}</SelectItem>
                    {policyOptions
                      .filter((o) => o.label !== t('mihomo.matchPolicyAuto'))
                      .map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Column 3: Output — rule providers, geo rules, manual rules, order */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('mihomo.columnOutput')}</h2>
          <div className="space-y-4">
            <RuleProviders
              providers={state.ruleProviders}
              groupNames={groupNames}
              onAdd={(rp) => dispatch({ type: 'ADD_RULE_PROVIDER', payload: rp })}
              onRemove={(i) =>
                dispatch({ type: 'REMOVE_RULE_PROVIDER', payload: i })
              }
            />
            <GeoRules
              geositeList={state.geosite}
              geoipList={state.geoip}
              rulesGeosite={state.rulesGeosite}
              rulesGeoip={state.rulesGeoip}
              onLoadGeosite={loadGeosite}
              onLoadGeoip={loadGeoip}
              onSetGeositePolicy={(name, target) =>
                dispatch({ type: 'SET_GEOSITE_POLICY', payload: { name, target } })
              }
              onSetGeoipPolicy={(code, target) =>
                dispatch({ type: 'SET_GEOIP_POLICY', payload: { code, target } })
              }
              onResetGeosite={resetGeositeSelection}
              onResetGeoip={resetGeoipSelection}
              policyOptions={policyOptions}
            />
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <b className="text-sm">{t('mihomo.advancedRulesTitle')}</b>
                <p className="text-xs text-muted-foreground">{t('mihomo.advancedRulesHint')}</p>
              </div>
              <Switch
                checked={state.useAdvancedRulesYaml}
                onCheckedChange={(v) => dispatch({ type: 'SET_USE_ADVANCED_RULES', payload: v })}
              />
            </div>
            {state.useAdvancedRulesYaml && (
              <Textarea
                value={state.advancedRulesYaml}
                onChange={(e) => dispatch({ type: 'SET_ADVANCED_RULES_YAML', payload: e.target.value })}
                className="font-mono text-sm"
                spellCheck={false}
                rows={8}
              />
            )}
            <ManualRules
              rules={state.manualRules}
              groupNames={groupNames}
              onAdd={(r) => dispatch({ type: 'ADD_MANUAL_RULE', payload: r })}
              onRemove={(i) =>
                dispatch({ type: 'REMOVE_MANUAL_RULE', payload: i })
              }
            />
          </div>
          <section className="mt-4">
            <RuleOrder
              entries={
                state.ruleOrder.length
                  ? state.ruleOrder
                  : buildRuleEntriesArray(state)
              }
              onMove={(index, dir) =>
                dispatch({ type: 'MOVE_RULE', payload: { index, direction: dir } })
              }
            />
          </section>
        </div>

        {/* Column 4: Ready config — generated YAML, copy/download */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t('mihomo.columnConfig')}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setImportDialogOpen(true)}>
              {t('mihomo.importButton')}
            </Button>
          </div>
          <YamlOutput
            state={state}
            status={status}
            statusText={statusText}
            dispatch={dispatch}
            onShare={handleShare}
          />
        </div>
      </div>

      {importDialogOpen && (
        <ImportConfigDialog
          onClose={() => setImportDialogOpen(false)}
          onApply={(payload) => {
            dispatch({ type: 'IMPORT_YAML', payload })
            setImportDialogOpen(false)
          }}
        />
      )}

      <ConfigTopology state={state} />
    </div>
  )
}
