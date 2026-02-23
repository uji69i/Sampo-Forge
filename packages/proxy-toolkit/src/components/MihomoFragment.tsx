import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MihomoProxy } from '@sampo-forge/shared/lib/mihomo/types'
import { emitProxiesYaml } from '@sampo-forge/shared/lib/mihomo/yaml-gen'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import { useLocalePath } from '@sampo-forge/shared/i18n/useLocalePath'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Button } from '@sampo-forge/shared/ui/button'
import { cn } from '@sampo-forge/shared/lib/utils'

interface MihomoFragmentProps {
  proxies: MihomoProxy[]
}

export function MihomoFragment({ proxies }: MihomoFragmentProps) {
  const { t } = useTranslation()
  const localePath = useLocalePath()
  const [copyFeedback, setCopyFeedback] = useState<'yaml' | 'json' | null>(null)

  if (!proxies.length) return null

  const yamlFragment = emitProxiesYaml(proxies)
  const jsonFragment = JSON.stringify(proxies, null, 2)

  function copy(type: 'yaml' | 'json') {
    const text = type === 'yaml' ? yamlFragment : jsonFragment
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(type)
      setTimeout(() => setCopyFeedback(null), 1500)
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('proxyToolkit.exportTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-muted-foreground">{t('proxyToolkit.exportHint')}</p>
        <p className="text-sm">
          <Link to={localePath('/mihomo-config-generator')} className="text-primary">
            {t('proxyToolkit.exportLink')}
          </Link>
          {t('proxyToolkit.exportLinkSuffix')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => copy('yaml')}>
            {t('proxyToolkit.copyMihomoYaml')}
            <span
              className={cn(
                'ml-1 text-xs text-green-500 transition-opacity',
                copyFeedback === 'yaml' ? 'opacity-100' : 'opacity-0'
              )}
            >
              {t('awg.copied')}
            </span>
          </Button>
          <Button type="button" variant="secondary" onClick={() => copy('json')}>
            {t('proxyToolkit.copyJson')}
            <span
              className={cn(
                'ml-1 text-xs text-green-500 transition-opacity',
                copyFeedback === 'json' ? 'opacity-100' : 'opacity-0'
              )}
            >
              {t('awg.copied')}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
