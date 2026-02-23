import { useParams, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom'
import { useMemo } from 'react'
import { I18nProvider } from '@/i18n/context'
import { LOCALES, type Locale } from '@/i18n/I18nContext'

function getPathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return '/'
  return '/' + segments.slice(1).join('/')
}

export function LocaleGuard() {
  const { locale: localeParam } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const locale = localeParam as Locale | undefined
  const isValidLocale = locale && LOCALES.includes(locale)

  const setLocale = useMemo(() => {
    return (next: Locale) => {
      const pathWithoutLocale = getPathWithoutLocale(location.pathname)
      navigate(`${pathWithoutLocale === '/' ? `/${next}` : `/${next}${pathWithoutLocale}`}`)
    }
  }, [navigate, location.pathname])

  if (!isValidLocale) {
    return <Navigate to="/ru" replace />
  }

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <Outlet />
    </I18nProvider>
  )
}
