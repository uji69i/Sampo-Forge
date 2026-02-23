import { useTranslation } from '@/i18n/useTranslation'
import type { ProxyGroup } from '@/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useState } from 'react'

const GROUP_TYPES = ['select', 'url-test', 'fallback', 'load-balance'] as const

interface ProxyGroupsProps {
  groups: ProxyGroup[]
  proxyNames: string[]
  onAddGroup: (group: ProxyGroup) => void
  onUpdateGroup: (index: number, patch: Partial<ProxyGroup>) => void
  onRemoveGroup: (index: number) => void
  advancedYaml: string
  advancedEnabled: boolean
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <Label className="min-w-[120px] text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function ProxyGroups({
  groups,
  proxyNames,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  advancedYaml,
  advancedEnabled,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: ProxyGroupsProps) {
  const { t } = useTranslation()

  const handleAdd = () => {
    onAddGroup({
      name: `group-${groups.length + 1}`,
      type: 'select',
      icon: '',
      proxies: [],
      manual: [],
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">{t('mihomo.groupsTitle')}</CardTitle>
        <Button size="sm" onClick={handleAdd}>{t('mihomo.addGroupButton')}</Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {groups.length === 0 && !advancedEnabled ? (
          <p className="text-sm text-muted-foreground">{t('mihomo.emptyGroups')}</p>
        ) : (
          groups.map((g, idx) => (
            <GroupCard key={idx} g={g} idx={idx} proxyNames={proxyNames} onUpdate={onUpdateGroup} onRemove={onRemoveGroup} t={t} />
          ))
        )}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <b className="text-sm">{t('mihomo.advancedGroupsTitle')}</b>
            <p className="text-xs text-muted-foreground">{t('mihomo.advancedGroupsHint')}</p>
          </div>
          <Switch checked={advancedEnabled} onCheckedChange={onAdvancedToggle} />
        </div>
        {advancedEnabled && (
          <Textarea value={advancedYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={8} />
        )}
      </CardContent>
    </Card>
  )
}

function GroupCard({
  g,
  idx,
  proxyNames,
  onUpdate,
  onRemove,
  t,
}: {
  g: ProxyGroup
  idx: number
  proxyNames: string[]
  onUpdate: (index: number, patch: Partial<ProxyGroup>) => void
  onRemove: (index: number) => void
  t: (key: string) => string
}) {
  const [advOpen, setAdvOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder={t('mihomo.groupNamePlaceholder')} value={g.name} onChange={(e) => onUpdate(idx, { name: e.target.value.trim() || 'GROUP' })} className="min-w-[120px]" />
        <Select value={g.type} onValueChange={(v) => onUpdate(idx, { type: v as ProxyGroup['type'] })}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{GROUP_TYPES.map((typeVal) => <SelectItem key={typeVal} value={typeVal}>{typeVal}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Row label={t('mihomo.iconLabel')}><Input placeholder="https://..." value={g.icon ?? ''} onChange={(e) => onUpdate(idx, { icon: e.target.value.trim() })} className="flex-1" /></Row>
      <Row label={t('mihomo.manualLabel')}><Input placeholder={t('mihomo.manualPlaceholder')} value={(g.manual ?? []).join(', ')} onChange={(e) => onUpdate(idx, { manual: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="flex-1" /></Row>
      <p className="text-xs text-muted-foreground">{t('mihomo.groupProxiesHint')}</p>
      <div className="flex flex-wrap gap-3">
        {proxyNames.map((n) => (
          <label key={n} className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={(g.proxies ?? []).includes(n)} onCheckedChange={(v) => { const next = v ? [...(g.proxies ?? []), n] : (g.proxies ?? []).filter((x) => x !== n); onUpdate(idx, { proxies: next }) }} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {advOpen ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
            {t('mihomo.groupAdvancedSection')}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Row label={t('mihomo.groupFilter')}><Input placeholder="(?i)🇷🇺|RU" value={g.filter ?? ''} onChange={(e) => onUpdate(idx, { filter: e.target.value.trim() || undefined })} className="flex-1" /></Row>
          <Row label={t('mihomo.groupExcludeFilter')}><Input placeholder="(?i)🇷🇺|RU" value={g.excludeFilter ?? ''} onChange={(e) => onUpdate(idx, { excludeFilter: e.target.value.trim() || undefined })} className="flex-1" /></Row>
          <Row label={t('mihomo.groupExcludeType')}><Input placeholder="ss|trojan|vless|vmess|..." value={g.excludeType ?? ''} onChange={(e) => onUpdate(idx, { excludeType: e.target.value.trim() || undefined })} className="flex-1" /></Row>
          <Row label={t('mihomo.groupUrl')}><Input placeholder="http://www.gstatic.com/generate_204" value={g.url ?? ''} onChange={(e) => onUpdate(idx, { url: e.target.value.trim() || undefined })} className="flex-1" /></Row>
          <Row label={t('mihomo.groupInterval')}><Input type="number" min={0} value={g.interval ?? ''} onChange={(e) => onUpdate(idx, { interval: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || undefined })} className="w-24" /></Row>
          {(g.type === 'url-test' || g.type === 'load-balance') && (
            <Row label={t('mihomo.groupTolerance')}><Input type="number" min={0} value={g.tolerance ?? ''} onChange={(e) => onUpdate(idx, { tolerance: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || undefined })} className="w-24" /></Row>
          )}
          <Row label={t('mihomo.groupExpectedStatus')}><Input placeholder="200-399" value={g.expectedStatus ?? ''} onChange={(e) => onUpdate(idx, { expectedStatus: e.target.value.trim() || undefined })} className="w-32" /></Row>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm"><Checkbox checked={g.lazy ?? false} onCheckedChange={(v) => onUpdate(idx, { lazy: v === true || undefined })} /><span>{t('mihomo.groupLazy')}</span></label>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><Checkbox checked={g.includeAll ?? false} onCheckedChange={(v) => onUpdate(idx, { includeAll: v === true || undefined })} /><span>{t('mihomo.groupIncludeAll')}</span></label>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><Checkbox checked={g.hidden ?? false} onCheckedChange={(v) => onUpdate(idx, { hidden: v === true || undefined })} /><span>{t('mihomo.groupHidden')}</span></label>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">{t('mihomo.updateProxyHint')}</span>
        <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(idx)}>{t('mihomo.deleteGroup')}</Button>
      </div>
    </div>
  )
}
