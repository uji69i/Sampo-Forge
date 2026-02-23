import { Helmet } from 'react-helmet-async'
import { useTranslation } from '@/i18n/useTranslation'

export function DocumentHead() {
  const { t } = useTranslation()

  return (
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <meta name="keywords" content={t('meta.keywords')} />
      <meta property="og:title" content={t('meta.title')} />
      <meta property="og:description" content={t('meta.ogDescription')} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={t('meta.title')} />
      <meta name="twitter:description" content={t('meta.ogDescription')} />
    </Helmet>
  )
}
