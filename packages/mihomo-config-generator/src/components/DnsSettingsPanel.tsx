import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import type { DnsSettings } from '@sampo-forge/shared/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@sampo-forge/shared/ui/collapsible'
import { Switch } from '@sampo-forge/shared/ui/switch'
import { Label } from '@sampo-forge/shared/ui/label'
import { Input } from '@sampo-forge/shared/ui/input'
import { Button } from '@sampo-forge/shared/ui/button'
import { Textarea } from '@sampo-forge/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sampo-forge/shared/ui/select'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

const ENHANCED_MODES = ['fake-ip', 'redir-host'] as const
const CACHE_ALGORITHMS = ['arc', 'lru'] as const

function ListEditor({
  items,
  onChange,
  placeholder,
  singleLinePlaceholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  singleLinePlaceholder?: string
}) {
  const [newItem, setNewItem] = useState('')
  const add = () => {
    const v = newItem.trim()
    if (!v) return
    onChange([...items, v])
    setNewItem('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={singleLinePlaceholder ?? placeholder} className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={add}>+</Button>
      </div>
      <ul className="space-y-1 list-none p-0 m-0">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between gap-2 rounded border border-border bg-muted/30 px-2 py-1.5">
            <span className="font-mono text-sm truncate">{item}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, i) => i !== idx))} aria-label="Remove">−</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface DnsSettingsPanelProps {
  settings: DnsSettings
  useDnsSettings: boolean
  advancedDnsYaml: string
  useAdvancedDnsYaml: boolean
  onSettingsChange: (patch: Partial<DnsSettings>) => void
  onUseToggle: (enabled: boolean) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <Label className="min-w-[140px] text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function DnsSettingsPanel({
  settings,
  useDnsSettings,
  advancedDnsYaml,
  useAdvancedDnsYaml,
  onSettingsChange,
  onUseToggle,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: DnsSettingsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{t('mihomo.dnsSettingsTitle')}</CardTitle>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Switch checked={useDnsSettings} onCheckedChange={onUseToggle} />
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </div>
            </CardHeader>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('mihomo.dnsAdvancedYaml')}</span>
              <Switch checked={useAdvancedDnsYaml} onCheckedChange={onAdvancedToggle} />
            </div>
            {useAdvancedDnsYaml ? (
              <Textarea value={advancedDnsYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={10} placeholder="dns:\n  enable: true\n  nameserver:\n    - tls://1.1.1.1" />
            ) : (
              <div className="space-y-4">
                <Row label={t('mihomo.dnsEnable')}><Switch checked={settings.enable} onCheckedChange={(v) => onSettingsChange({ enable: v })} /></Row>
                <Row label={t('mihomo.dnsListen')}><Input type="text" value={settings.listen ?? ''} onChange={(e) => onSettingsChange({ listen: e.target.value.trim() || undefined })} placeholder="0.0.0.0:1053" className="flex-1 min-w-[160px]" /></Row>
                <Row label={t('mihomo.dnsEnhancedMode')}>
                  <Select value={settings.enhancedMode} onValueChange={(v) => onSettingsChange({ enhancedMode: v as DnsSettings['enhancedMode'] })}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{ENHANCED_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <Row label={t('mihomo.dnsFakeIpRange')}><Input type="text" value={settings.fakeIpRange ?? ''} onChange={(e) => onSettingsChange({ fakeIpRange: e.target.value.trim() || undefined })} placeholder="198.18.0.1/16" className="flex-1 min-w-[160px]" /></Row>
                <Row label={t('mihomo.dnsUseHosts')}><Switch checked={settings.useHosts} onCheckedChange={(v) => onSettingsChange({ useHosts: v })} /></Row>
                <Row label={t('mihomo.dnsUseSystemHosts')}><Switch checked={settings.useSystemHosts} onCheckedChange={(v) => onSettingsChange({ useSystemHosts: v })} /></Row>
                <Row label={t('mihomo.dnsCacheAlgorithm')}>
                  <Select value={settings.cacheAlgorithm ?? 'empty'} onValueChange={(v) => onSettingsChange({ cacheAlgorithm: v === 'empty' ? undefined : v as DnsSettings['cacheAlgorithm'] })}>
                    <SelectTrigger className="w-[100px]"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent><SelectItem value="empty">—</SelectItem>{CACHE_ALGORITHMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{t('mihomo.dnsNameserver')}</h3>
                  <ListEditor items={settings.nameserver ?? []} onChange={(nameserver) => onSettingsChange({ nameserver })} placeholder={t('mihomo.dnsNameserverPlaceholder')} singleLinePlaceholder="tls://1.1.1.1" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{t('mihomo.dnsFallback')}</h3>
                  <ListEditor items={settings.fallback ?? []} onChange={(fallback) => onSettingsChange({ fallback })} placeholder={t('mihomo.dnsFallbackPlaceholder')} singleLinePlaceholder="tls://8.8.8.8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{t('mihomo.dnsDefaultNameserver')}</h3>
                  <ListEditor items={settings.defaultNameserver ?? []} onChange={(defaultNameserver) => onSettingsChange({ defaultNameserver })} placeholder={t('mihomo.dnsDefaultNameserverPlaceholder')} />
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
