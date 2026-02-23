import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import type { RuleProvider } from '@sampo-forge/shared/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Button } from '@sampo-forge/shared/ui/button'
import { Input } from '@sampo-forge/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sampo-forge/shared/ui/select'
import { Badge } from '@sampo-forge/shared/ui/badge'

const BEHAVIORS = ['classical', 'domain', 'ipcidr'] as const

interface RuleProvidersProps {
  providers: RuleProvider[]
  groupNames: string[]
  onAdd: (rp: RuleProvider) => void
  onRemove: (index: number) => void
}

/** RULE-SET rule-providers: name, URL, behavior, policy. */
export function RuleProviders({
  providers,
  groupNames,
  onAdd,
  onRemove,
}: RuleProvidersProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [behavior, setBehavior] = useState<string>('classical')
  const [policy, setPolicy] = useState('')

  const policyOptions = [
    { value: '', label: t('mihomo.ruleActionPlaceholder') },
    { value: 'DIRECT', label: 'DIRECT' },
    { value: 'REJECT', label: 'REJECT' },
    ...groupNames.map((n) => ({ value: n, label: n })),
  ]

  const handleAdd = () => {
    const n = name.trim()
    const u = url.trim()
    if (!n || !u) return
    onAdd({
      name: n,
      url: u,
      behavior: behavior || 'classical',
      format: 'yaml',
      policy: policy || undefined,
    })
    setName('')
    setUrl('')
    setPolicy('')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">RULE-PROVIDERS</span>
        <CardTitle className="text-base">{t('mihomo.ruleProvidersTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.ruleProvidersSub')}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            placeholder={t('mihomo.ruleProvidersNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[120px]"
          />
          <Input
            type="url"
            placeholder={t('mihomo.ruleProvidersUrlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 min-w-[160px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={behavior} onValueChange={setBehavior}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BEHAVIORS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={policy === '' ? 'empty' : policy} onValueChange={(v) => setPolicy(v === 'empty' ? '' : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('mihomo.ruleActionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {policyOptions.map((o) => (
                <SelectItem key={o.value === '' ? 'empty' : o.value} value={o.value === '' ? 'empty' : o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleAdd}>
            {t('mihomo.addRuleProviderButton')}
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 min-h-[80px]">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.noRuleProviders')}</p>
          ) : (
            providers.map((rp, idx) => (
              <div key={rp.name} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{rp.name}</strong>
                  <Badge variant="secondary" className="text-xs">RULE-SET → {rp.policy ?? '?'}</Badge>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
                  <span>{rp.url}</span>
                  <span>behavior: {rp.behavior ?? 'classical'} · format: {rp.format ?? 'yaml'}</span>
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(idx)}>
                  {t('mihomo.delete')}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
