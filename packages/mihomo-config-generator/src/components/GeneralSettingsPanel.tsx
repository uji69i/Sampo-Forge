import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import type { GeneralSettings } from '@sampo-forge/shared/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@sampo-forge/shared/ui/collapsible'
import { Switch } from '@sampo-forge/shared/ui/switch'
import { Label } from '@sampo-forge/shared/ui/label'
import { Input } from '@sampo-forge/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sampo-forge/shared/ui/select'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
const MODES = ['rule', 'global', 'direct'] as const
const LOG_LEVELS = ['silent', 'error', 'warning', 'info', 'debug'] as const
const FIND_PROCESS_MODES = ['strict', 'always', 'off'] as const

interface GeneralSettingsPanelProps {
  settings: GeneralSettings
  useGeneralSettings: boolean
  onSettingsChange: (patch: Partial<GeneralSettings>) => void
  onUseToggle: (enabled: boolean) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <Label className="min-w-[140px] text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function GeneralSettingsPanel({
  settings,
  useGeneralSettings,
  onSettingsChange,
  onUseToggle,
}: GeneralSettingsPanelProps) {
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
              <CardTitle className="text-base">{t('mihomo.generalSettingsTitle')}</CardTitle>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Switch checked={useGeneralSettings} onCheckedChange={onUseToggle} />
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </div>
            </CardHeader>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            <Row label={t('mihomo.generalMode')}>
              <Select value={settings.mode} onValueChange={(v) => onSettingsChange({ mode: v as GeneralSettings['mode'] })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label={t('mihomo.generalMixedPort')}>
              <Input type="number" min={1} max={65535} value={settings.mixedPort ?? ''} onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : undefined
                onSettingsChange({ mixedPort: Number.isFinite(v) ? v : undefined })
              }} placeholder="7890" className="w-24" />
            </Row>
            <Row label={t('mihomo.generalAllowLan')}>
              <Switch checked={settings.allowLan} onCheckedChange={(v) => onSettingsChange({ allowLan: v })} />
            </Row>
            <Row label={t('mihomo.generalBindAddress')}>
              <Input type="text" value={settings.bindAddress ?? ''} onChange={(e) => onSettingsChange({ bindAddress: e.target.value.trim() || undefined })} placeholder="0.0.0.0" className="flex-1 min-w-[160px]" />
            </Row>
            <Row label={t('mihomo.generalLogLevel')}>
              <Select value={settings.logLevel} onValueChange={(v) => onSettingsChange({ logLevel: v as GeneralSettings['logLevel'] })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{LOG_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label={t('mihomo.generalExternalController')}>
              <Input type="text" value={settings.externalController ?? ''} onChange={(e) => onSettingsChange({ externalController: e.target.value.trim() || undefined })} placeholder="127.0.0.1:9090" className="flex-1 min-w-[160px]" />
            </Row>
            <Row label={t('mihomo.generalSecret')}>
              <Input type="text" value={settings.secret ?? ''} onChange={(e) => onSettingsChange({ secret: e.target.value.trim() || undefined })} className="flex-1 min-w-[120px]" />
            </Row>
            <Row label={t('mihomo.generalIpv6')}>
              <Switch checked={settings.ipv6} onCheckedChange={(v) => onSettingsChange({ ipv6: v })} />
            </Row>
            <Row label={t('mihomo.generalUnifiedDelay')}>
              <Switch checked={settings.unifiedDelay} onCheckedChange={(v) => onSettingsChange({ unifiedDelay: v })} />
            </Row>
            <Row label={t('mihomo.generalGeodataMode')}>
              <Switch checked={settings.geodataMode} onCheckedChange={(v) => onSettingsChange({ geodataMode: v })} />
            </Row>
            <Row label={t('mihomo.generalTcpConcurrent')}>
              <Switch checked={settings.tcpConcurrent} onCheckedChange={(v) => onSettingsChange({ tcpConcurrent: v })} />
            </Row>
            <Row label={t('mihomo.generalFindProcessMode')}>
              <Select value={settings.findProcessMode ?? 'empty'} onValueChange={(v) => onSettingsChange({ findProcessMode: (v === 'empty' ? undefined : v) as GeneralSettings['findProcessMode'] })}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">—</SelectItem>
                  {FIND_PROCESS_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label={t('mihomo.generalGlobalClientFingerprint')}>
              <Input type="text" value={settings.globalClientFingerprint ?? ''} onChange={(e) => onSettingsChange({ globalClientFingerprint: e.target.value.trim() || undefined })} placeholder="chrome" className="flex-1 min-w-[120px]" />
            </Row>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
