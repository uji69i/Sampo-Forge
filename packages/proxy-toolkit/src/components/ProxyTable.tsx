import React from 'react'
import type { MihomoProxy } from '@sampo-forge/shared/lib/mihomo/types'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import { ProxyExplainRow } from './ProxyExplainRow'
import { cn } from '@sampo-forge/shared/lib/utils'

interface ProxyTableProps {
  proxies: MihomoProxy[]
  expandedIndex: number
  onToggleExpand: (index: number) => void
}

export function ProxyTable({
  proxies,
  expandedIndex,
  onToggleExpand,
}: ProxyTableProps) {
  const { t } = useTranslation()

  if (!proxies.length) return null

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-[0.82rem]">
        <thead>
          <tr>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.name')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.type')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.server')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.port')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.network')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.tls')}
            </th>
            <th className="px-2.5 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('proxyToolkit.table.cipher')}
            </th>
            <th className="w-8 text-center" aria-label={t('proxyToolkit.explainExpand')} />
          </tr>
        </thead>
        <tbody>
          {proxies.map((proxy, index) => (
            <React.Fragment key={index}>
              <tr
                className={cn(
                  'cursor-pointer border-b border-border transition-colors hover:bg-secondary/50',
                  expandedIndex === index && 'bg-secondary/50'
                )}
                onClick={() => onToggleExpand(expandedIndex === index ? -1 : index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggleExpand(expandedIndex === index ? -1 : index)
                  }
                }}
              >
                <td className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{proxy.name ?? '—'}</td>
                <td>
                  <span className="inline-block rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.75rem]">
                    {proxy.type}
                  </span>
                </td>
                <td className="font-mono text-[0.78rem]">{proxy.server}</td>
                <td>{proxy.port ?? '—'}</td>
                <td>{proxy.network ?? 'tcp'}</td>
                <td>{proxy.tls ? t('proxyToolkit.yes') : t('proxyToolkit.no')}</td>
                <td className="text-[0.78rem] text-muted-foreground">{proxy.cipher ?? proxy.encryption ?? '—'}</td>
                <td className="text-center text-muted-foreground">
                  <span className="text-[0.7rem]" aria-hidden>
                    {expandedIndex === index ? '▼' : '▶'}
                  </span>
                </td>
              </tr>
              {expandedIndex === index && (
                <tr>
                  <td colSpan={8} className="border-b border-border p-0 align-top">
                    <ProxyExplainRow proxy={proxy} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
