import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { normalizeManualRule } from '@/lib/mihomo/validators'
import type { ManualRule, ManualRuleType } from '@/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

interface ManualRulesProps {
  rules: ManualRule[]
  groupNames: string[]
  onAdd: (rule: ManualRule) => void
  onRemove: (index: number) => void
}

/** User-added DOMAIN-SUFFIX, IP-CIDR, PROCESS-NAME rules. */
export function ManualRules({
  rules,
  groupNames,
  onAdd,
  onRemove,
}: ManualRulesProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<ManualRuleType>('DOMAIN-SUFFIX')
  const [value, setValue] = useState('')
  const [policy, setPolicy] = useState('')
  const [error, setError] = useState('')

  const policyOptions = [
    { value: '', label: '—' },
    { value: 'DIRECT', label: 'DIRECT' },
    { value: 'REJECT', label: 'REJECT' },
    ...groupNames.map((n) => ({ value: n, label: n })),
  ]

  const handleAdd = () => {
    setError('')
    const raw = value.trim()
    const pol = policy.trim()
    if (!raw || !pol) {
      setError(t('mihomo.manualRulesFillAll'))
      return
    }
    const result = normalizeManualRule(type, raw)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onAdd({
      type,
      value: result.value,
      policy: pol,
    })
    setValue('')
    setPolicy('')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">MANUAL RULES</span>
        <CardTitle className="text-base">{t('mihomo.manualRulesTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesSub')}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ManualRuleType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_RULE_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>{ty}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder={t('mihomo.manualRulesValuePlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 min-w-[120px]"
          />
          <Select value={policy || 'empty'} onValueChange={(v) => setPolicy(v === 'empty' ? '' : v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {policyOptions.map((o) => (
                <SelectItem key={o.value || 'empty'} value={o.value || 'empty'}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleAdd}>
            {t('mihomo.manualRulesAddButton')}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesHint')}</p>
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 min-h-[60px]">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mihomo.manualRulesEmpty')}</p>
          ) : (
            rules.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 rounded border border-border bg-card p-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-xs shrink-0">{r.type}</Badge>
                  <span className="font-mono text-sm truncate">{r.type},{r.value},{r.policy}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(idx)}>✕</Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
