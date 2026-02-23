import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import type { Subscription } from '@sampo-forge/shared/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Button } from '@sampo-forge/shared/ui/button'
import { Input } from '@sampo-forge/shared/ui/input'
import { Textarea } from '@sampo-forge/shared/ui/textarea'
import { Switch } from '@sampo-forge/shared/ui/switch'
import { Badge } from '@sampo-forge/shared/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sampo-forge/shared/ui/select'

interface SubscriptionsProps {
  subs: Subscription[]
  advancedYaml: string
  advancedEnabled: boolean
  onAddSub: (sub: Subscription) => void
  onRemoveSub: (index: number) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
  groupNames: string[]
}

/** Proxy-provider subscriptions (URLs); optional advanced YAML block. */
export function Subscriptions({
  subs,
  advancedYaml,
  advancedEnabled,
  onAddSub,
  onRemoveSub,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: SubscriptionsProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [fetchMode, setFetchMode] = useState<'DIRECT' | 'PROXY'>('DIRECT')

  const handleAdd = () => {
    const u = url.trim()
    if (!u) return
    const name = `sub-${subs.length + 1}`
    onAddSub({ name, url: u, interval: 3600, fetchMode })
    setUrl('')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('mihomo.subsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('mihomo.subsPlaceholder')} className="flex-1 min-w-[160px]" />
          <Select value={fetchMode} onValueChange={(v) => setFetchMode(v as 'DIRECT' | 'PROXY')}>
            <SelectTrigger className="w-[100px]" title={t('mihomo.subsFetchModeTitle')}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="DIRECT">DIRECT</SelectItem><SelectItem value="PROXY">{t('mihomo.viaProxy')}</SelectItem></SelectContent>
          </Select>
          <Button type="button" onClick={handleAdd}>{t('mihomo.addSubButton')}</Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('mihomo.subsHint')}</p>
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 min-h-[60px]">
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.noSubs')}</p>
          ) : (
            subs.map((sub, idx) => (
              <div key={sub.name} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card p-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <strong className="text-sm">{sub.name}</strong>
                  <Badge variant="secondary" className="text-xs">{sub.fetchMode}</Badge>
                </div>
                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{sub.url}</span>
                <Button type="button" variant="destructive" size="sm" onClick={() => onRemoveSub(idx)} aria-label={t('mihomo.delete')}>✕</Button>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <b className="text-sm">{t('mihomo.advancedSubsTitle')}</b>
            <p className="text-xs text-muted-foreground">{t('mihomo.advancedSubsHint')}</p>
          </div>
          <Switch checked={advancedEnabled} onCheckedChange={onAdvancedToggle} />
        </div>
        {advancedEnabled && (
          <Textarea value={advancedYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={6} />
        )}
      </CardContent>
    </Card>
  )
}
