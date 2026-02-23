import type { MihomoProxy } from '@/lib/mihomo/types'
import { useTranslation } from '@/i18n/useTranslation'
import { explainProxy } from '@/lib/proxy-explain'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProxyExplainRowProps {
  proxy: MihomoProxy
}

const riskVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'secondary',
  warning: 'outline',
  danger: 'destructive',
}

const strengthColor: Record<string, string> = {
  strong: 'text-green-500',
  moderate: 'text-amber-500',
  weak: 'text-destructive',
  none: 'text-destructive',
  info: 'text-muted-foreground',
}

export function ProxyExplainRow({ proxy }: ProxyExplainRowProps) {
  const { t } = useTranslation()
  const ex = explainProxy(proxy)

  return (
    <div className="rounded-b-lg bg-secondary/50 px-5 py-4">
      <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        <section>
          <h4 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('proxyToolkit.explain.protocolTitle')}
          </h4>
          <p className="text-sm font-semibold">{ex.protocol.name}</p>
          <p className="text-sm text-muted-foreground">{t(ex.protocol.descriptionKey)}</p>
        </section>

        {ex.cipher && (
          <section>
            <h4 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.explain.cipherTitle')}
            </h4>
            <p className="text-sm font-semibold">
              <span className={cn('cipher-strength', strengthColor[ex.cipher.strength] ?? strengthColor.info)}>
                {ex.cipher.name}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{t(ex.cipher.descriptionKey)}</p>
          </section>
        )}

        {ex.network && (
          <section>
            <h4 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.explain.networkTitle')}
            </h4>
            <p className="text-sm font-semibold">{ex.network.name}</p>
            <p className="text-sm text-muted-foreground">{t(ex.network.descriptionKey)}</p>
          </section>
        )}

        <section>
          <h4 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('proxyToolkit.explain.tlsTitle')}
          </h4>
          <p className="text-sm font-semibold">
            {ex.tls.enabled
              ? ex.tls.reality
                ? 'Reality'
                : 'TLS'
              : t('proxyToolkit.no')}
          </p>
          {ex.tls.sni && <p className="mt-1 font-mono text-xs text-muted-foreground">SNI: {ex.tls.sni}</p>}
          <p className="text-sm text-muted-foreground">{t(ex.tls.descriptionKey)}</p>
        </section>
      </div>

      {ex.risks.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('proxyToolkit.explain.risksTitle')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {ex.risks.map((r, i) => (
              <Badge
                key={i}
                variant={riskVariant[r.level] ?? 'secondary'}
                className="text-[0.72rem] font-medium"
                title={t(r.textKey)}
              >
                {t(r.textKey)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">{t('proxyToolkit.explain.rawJson')}</summary>
        <pre className="mt-2 max-h-[280px] overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-[0.72rem] font-mono">
          {JSON.stringify(proxy, null, 2)}
        </pre>
      </details>
    </div>
  )
}
