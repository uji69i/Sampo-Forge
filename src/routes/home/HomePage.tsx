import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useLocalePath } from '@/i18n/useLocalePath'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const tools = [
  { path: '/proxy-toolkit', labelKey: 'common.tools.proxyToolkit' as const, descriptionKey: 'home.toolDesc.proxyToolkit' as const },
  { path: '/awg-qr-generator', labelKey: 'common.tools.awgQrGenerator' as const, descriptionKey: 'home.toolDesc.awgQrGenerator' as const },
  { path: '/awg-config-generator', labelKey: 'common.tools.awgConfigGenerator' as const, descriptionKey: 'home.toolDesc.awgConfigGenerator' as const },
  { path: '/mihomo-config-generator', labelKey: 'common.tools.mihomoConfigGenerator' as const, descriptionKey: 'home.toolDesc.mihomoConfigGenerator' as const },
] as const

const credits = [
  { url: 'https://hub.docker.com/r/wiktorbgu/mihomo-mikrotik', labelKey: 'home.credits.mihomoMikrotik' as const },
  { url: 'https://github.com/Viktor45/mh-templates', labelKey: 'home.credits.mhTemplates' as const },
  { url: 'https://github.com/raywari/mihomo-constructor', labelKey: 'home.credits.mihomoConstructor' as const },
  { url: 'https://github.com/youshandefeiyang/sub-web-modify', labelKey: 'home.credits.subWebModify' as const },
  { url: 'https://github.com/tindy2013/subconverter', labelKey: 'home.credits.subconverter' as const },
] as const

export function HomePage() {
  const { t } = useTranslation()
  const localePath = useLocalePath()

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('home.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('home.subtitle')}</p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {tools.map(({ path, labelKey, descriptionKey }) => (
          <Link key={path} to={localePath(path)} className="block no-underline">
            <Card className="h-full transition-colors hover:border-primary hover:bg-secondary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t(labelKey)}</CardTitle>
                <CardDescription className="mt-1.5 text-sm">{t(descriptionKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-3 text-[1.1rem] font-semibold">{t('home.creditsTitle')}</h2>
        {t('home.creditsIntro') && <p className="mb-3 text-[0.95rem] text-muted-foreground">{t('home.creditsIntro')}</p>}
        <ul className="list-inside list-disc pl-5 space-y-1.5">
          {credits.map(({ url, labelKey }) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline">
                {t(labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
