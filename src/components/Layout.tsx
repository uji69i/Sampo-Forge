import { Outlet, Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Github } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useLocalePath } from '@/i18n/useLocalePath'
import { useTheme } from '@/theme/context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LOCALES, type Locale } from '@/i18n/I18nContext'
import { DocumentHead } from '@/components/DocumentHead'

const LOCALE_LABEL_KEYS: Record<Locale, string> = {
  ru: 'common.langRu',
  en: 'common.langEn',
  zh: 'common.langZh',
  fa: 'common.langFa',
}

const tools = [
  { path: '/', labelKey: 'common.home' as const },
  { path: '/proxy-toolkit', labelKey: 'common.tools.proxyToolkit' as const },
  { path: '/awg-qr-generator', labelKey: 'common.tools.awgQrGenerator' as const },
  { path: '/awg-config-generator', labelKey: 'common.tools.awgConfigGenerator' as const },
  { path: '/mihomo-config-generator', labelKey: 'common.tools.mihomoConfigGenerator' as const },
] as const

function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return '/'
  return '/' + segments.slice(1).join('/')
}

export function Layout() {
  const location = useLocation()
  const { t, locale, setLocale } = useTranslation()
  const localePath = useLocalePath()
  const { theme, setTheme } = useTheme()
  const currentPath = pathWithoutLocale(location.pathname)
  const isWide = currentPath === '/mihomo-config-generator'

  return (
    <div className="min-h-screen p-4">
      <DocumentHead />
      <header className="mx-auto mb-6 flex max-w-full flex-wrap items-center gap-6 rtl:flex-row-reverse">
        <Link
          to={localePath('/')}
          className="text-xl font-bold text-foreground no-underline transition-colors hover:text-primary"
        >
          {t('common.appTitle')}
        </Link>
        <span className="text-sm text-muted-foreground" aria-label="Version">
          v{__APP_VERSION__}
        </span>
        <nav className="flex gap-1">
          {tools.map(({ path, labelKey }) => (
            <Link
              key={path}
              to={localePath(path)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors',
                currentPath === path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <span className="ml-auto flex gap-0.5 rtl:ml-0 rtl:mr-auto">
          {LOCALES.map((loc) => (
            <Button
              key={loc}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                locale === loc && 'border-primary text-primary hover:bg-primary/10 hover:text-primary'
              )}
              onClick={() => setLocale(loc as Locale)}
              aria-label={t(LOCALE_LABEL_KEYS[loc])}
            >
              {t(LOCALE_LABEL_KEYS[loc])}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            asChild
          >
            <a
              href="https://github.com/uji69i/Sampo-Forge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Github className="size-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </span>
      </header>
      <main className={cn('mx-auto', isWide ? 'max-w-full' : 'max-w-[900px]')}>
        <Outlet />
      </main>
      <footer
        className={cn(
          'mx-auto mt-8 flex max-w-[900px] flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground rtl:flex-row-reverse',
          isWide && 'max-w-full'
        )}
        role="contentinfo"
      >
        <span>{t('common.footerCopyright', { year: new Date().getFullYear() })}</span>
      </footer>
    </div>
  )
}
