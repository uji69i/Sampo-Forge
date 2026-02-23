import { createContext } from 'react'

export type Locale = 'ru' | 'en' | 'zh' | 'fa'

export const LOCALES: Locale[] = ['ru', 'en', 'zh', 'fa']

export type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
