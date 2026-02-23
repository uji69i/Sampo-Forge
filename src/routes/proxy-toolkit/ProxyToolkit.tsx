import { useTranslation } from '@/i18n/useTranslation'
import { AwgTab } from './components/AwgTab'
import { SubDecoderTab } from './components/SubDecoderTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function ProxyToolkit() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('proxyToolkit.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('proxyToolkit.subtitle')}</p>

      <Tabs defaultValue="awg" className="mb-6">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="awg" className="flex-1">
            {t('proxyToolkit.tabAwg')}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex-1">
            {t('proxyToolkit.tabSubscription')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="awg">
          <AwgTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubDecoderTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
