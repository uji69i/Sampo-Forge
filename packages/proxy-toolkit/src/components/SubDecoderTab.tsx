import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import { decodeSubscription } from '@sampo-forge/shared/lib/mihomo/decode-subscription'
import type { MihomoProxy } from '@sampo-forge/shared/lib/mihomo/types'
import { ProxyTable } from './ProxyTable'
import { MihomoFragment } from './MihomoFragment'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Button } from '@sampo-forge/shared/ui/button'
import { Textarea } from '@sampo-forge/shared/ui/textarea'

export function SubDecoderTab() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [proxies, setProxies] = useState<MihomoProxy[]>([])
  const [errors, setErrors] = useState<{ u: string; err: string }[]>([])
  const [inputFormat, setInputFormat] = useState<'base64' | 'raw' | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number>(-1)
  const [hasDecoded, setHasDecoded] = useState(false)

  function doDecode() {
    const raw = input.trim()
    if (!raw) return
    setHasDecoded(true)
    const result = decodeSubscription(raw)
    setProxies(result.proxies)
    setErrors(result.errors)
    setInputFormat(result.inputFormat)
    setExpandedIndex(-1)
  }

  function clearAll() {
    setInput('')
    setProxies([])
    setErrors([])
    setInputFormat(null)
    setExpandedIndex(-1)
    setHasDecoded(false)
  }

  const typeCounts = proxies.reduce<Record<string, number>>((acc, p) => {
    const type = (p.type || 'unknown').toLowerCase()
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('proxyToolkit.subDecoderPrompt')}
          </CardTitle>
          <p className="-mt-1 text-xs leading-snug text-muted-foreground">{t('proxyToolkit.subDecoderCorsHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('proxyToolkit.subDecoderPlaceholder')}
            spellCheck={false}
            rows={6}
            className="min-h-[100px] font-mono text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={doDecode}>
              {t('proxyToolkit.btnDecode')}
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              {t('awg.btnClear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasDecoded && (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('proxyToolkit.summaryTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0 text-sm">
              <span className="font-semibold">{t('proxyToolkit.summaryTotal', { count: proxies.length })}</span>
              {inputFormat && (
                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {inputFormat === 'base64'
                    ? t('proxyToolkit.formatBase64')
                    : t('proxyToolkit.formatRaw')}
                </span>
              )}
              {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <span key={type} className="font-mono text-xs text-muted-foreground">
                    {type}({count})
                  </span>
                ))}
              {errors.length > 0 && (
                <span className="text-destructive text-sm">
                  {t('proxyToolkit.summaryErrors', { count: errors.length })}
                </span>
              )}
            </CardContent>
          </Card>

          {proxies.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('proxyToolkit.tableTitle')}
                </CardTitle>
                <p className="-mt-1 text-xs text-muted-foreground">{t('proxyToolkit.tableHint')}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ProxyTable
                  proxies={proxies}
                  expandedIndex={expandedIndex}
                  onToggleExpand={setExpandedIndex}
                />
              </CardContent>
            </Card>
          )}

          {errors.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('proxyToolkit.errorsTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-none space-y-0 p-0 text-[0.82rem]">
                  {errors.map((e, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0"
                    >
                      <code className="break-all font-mono text-[0.75rem] text-muted-foreground">
                        {e.u.slice(0, 80)}{e.u.length > 80 ? '…' : ''}
                      </code>
                      <span className="text-destructive text-sm">{e.err}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <MihomoFragment proxies={proxies} />
        </>
      )}
    </>
  )
}
