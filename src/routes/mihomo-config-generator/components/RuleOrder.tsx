import { useTranslation } from '@/i18n/useTranslation'
import type { RuleEntry } from '@/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function isoToFlag(iso: string): string {
  const s = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(s)) return ''
  const A = 0x1f1e6
  const base = 'A'.codePointAt(0)!
  return String.fromCodePoint(
    A + (s.codePointAt(0)! - base),
    A + (s.codePointAt(1)! - base)
  )
}

interface RuleOrderProps {
  entries: RuleEntry[]
  onMove: (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => void
}

/** Order of rules (first match wins); move up/down/top/bottom, MATCH stays last. */
export function RuleOrder({ entries, onMove }: RuleOrderProps) {
  const { t } = useTranslation()
  const matchKind = 'MATCH'
  const movable = entries.filter((e) => e.kind !== matchKind)
  const matchEntry = entries.find((e) => e.kind === matchKind)

  const kindLabel = (e: RuleEntry): string => {
    switch (e.kind) {
      case 'GEOSITE':
        return t('mihomo.ruleOrderKindGeosite')
      case 'GEOIP':
        return t('mihomo.ruleOrderKindGeoip')
      case 'RULE-SET':
        return t('mihomo.ruleOrderKindRuleSet')
      case 'MANUAL':
        return t('mihomo.ruleOrderKindManual')
      case 'MATCH':
        return t('mihomo.ruleOrderKindMatch')
      default:
        return e.kind
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{t('mihomo.ruleOrderEyebrow')}</span>
          <CardTitle className="text-base">{t('mihomo.ruleOrderTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('mihomo.ruleOrderSub')}</p>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('mihomo.ruleOrderEmpty')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{t('mihomo.ruleOrderEyebrow')}</span>
        <CardTitle className="text-base">{t('mihomo.ruleOrderTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.ruleOrderSub')}</p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {movable.map((entry, index) => (
          <div
            key={`${entry.kind}-${entry.key}-${index}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge variant="secondary" className="shrink-0">{kindLabel(entry)}</Badge>
              {entry.kind === 'GEOIP' ? (
                <span className="text-sm">{isoToFlag(entry.key)} {entry.key}</span>
              ) : (
                <span className="text-sm truncate">{entry.key}</span>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'top')} title={t('mihomo.ruleOrderTop')}>⇡</Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'up')} title={t('mihomo.ruleOrderUp')}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'down')} title={t('mihomo.ruleOrderDown')}>↓</Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'bottom')} title={t('mihomo.ruleOrderBottom')}>⇣</Button>
            </div>
          </div>
        ))}
        {matchEntry && (
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-2">
            <Badge variant="secondary">{kindLabel(matchEntry)}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
