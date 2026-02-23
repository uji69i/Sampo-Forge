import { useParams } from 'react-router-dom'
import { useTranslation } from './useTranslation'
import type { Locale } from './I18nContext'

export function useLocalePath(): (path: string) => string {
  const { locale } = useTranslation()
  const { locale: paramLocale } = useParams<{ locale: string }>()
  const currentLocale = (paramLocale ?? locale) as Locale

  return (path: string) => {
    if (path === '/') return `/${currentLocale}`
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `/${currentLocale}${normalized}`
  }
}
