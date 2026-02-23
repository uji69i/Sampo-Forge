import { useState, useRef, useEffect } from 'react'
import {
  decodeConfig,
  encodeConfig,
  extractInfo,
  esc,
  type AmneziaConfig,
} from '@/lib/amnezia-config'
import { makeQR } from '@/lib/qr'
import { useTranslation } from '@/i18n/useTranslation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type TabName = 'decode' | 'encode'

export function AwgTab() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabName>('decode')

  const [decodeInput, setDecodeInput] = useState('')
  const [decodeOutputVisible, setDecodeOutputVisible] = useState(false)
  const [decodeError, setDecodeError] = useState('')
  const [decodeSuccess, setDecodeSuccess] = useState('')
  const [decodeInfoVisible, setDecodeInfoVisible] = useState(false)
  const [decodeJson, setDecodeJson] = useState('')
  const [decodeInfo, setDecodeInfo] = useState<Record<string, string>>({})
  const [decodeVpnUrl, setDecodeVpnUrl] = useState<string | null>(null)
  const [decodeQrMessage, setDecodeQrMessage] = useState<string | null>(null)
  const decodeQrRef = useRef<HTMLDivElement>(null)

  const [encodeInput, setEncodeInput] = useState('')
  const [encodeOutputVisible, setEncodeOutputVisible] = useState(false)
  const [encodeError, setEncodeError] = useState('')
  const [encodeResult, setEncodeResult] = useState('')
  const [encodeQrMessage, setEncodeQrMessage] = useState<string | null>(null)
  const encodeQrRef = useRef<HTMLDivElement>(null)

  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null)

  useEffect(() => {
    if (decodeVpnUrl && decodeQrRef.current) {
      makeQR(decodeVpnUrl, decodeQrRef.current)
    }
  }, [decodeVpnUrl])

  useEffect(() => {
    if (encodeResult && encodeQrRef.current && encodeResult.length <= 4000) {
      makeQR(encodeResult, encodeQrRef.current)
    }
  }, [encodeResult])

  function doDecode() {
    setDecodeOutputVisible(true)
    setDecodeError('')
    setDecodeSuccess('')
    setDecodeInfoVisible(false)
    setDecodeVpnUrl(null)
    setDecodeQrMessage(null)
    const raw = decodeInput.trim()
    if (!raw) {
      setDecodeError(t('awg.decodeErrorPrompt'))
      return
    }
    try {
      const config = decodeConfig(raw)
      const pretty = JSON.stringify(config, null, 2)
      setDecodeSuccess(t('awg.decodeSuccess'))
      setDecodeInfoVisible(true)
      setDecodeInfo(extractInfo(config))
      setDecodeJson(pretty)
      try {
        const vpnUrl = encodeConfig(config)
        if (vpnUrl.length <= 4000) {
          setDecodeVpnUrl(vpnUrl)
        } else {
          setDecodeQrMessage(t('awg.qrTooLong', { count: vpnUrl.length }))
        }
      } catch {
        setDecodeQrMessage(null)
      }
    } catch (e) {
      setDecodeError(
        t('awg.decodeError') + ': ' + (e instanceof Error ? e.message : String(e))
      )
    }
  }

  function clearDecode() {
    setDecodeInput('')
    setDecodeOutputVisible(false)
    setDecodeVpnUrl(null)
  }

  function doEncode() {
    setEncodeOutputVisible(true)
    setEncodeError('')
    setEncodeResult('')
    setEncodeQrMessage(null)
    const raw = encodeInput.trim()
    if (!raw) {
      setEncodeError(t('awg.encodeErrorPrompt'))
      return
    }
    try {
      const config = JSON.parse(raw) as AmneziaConfig
      const vpnUrl = encodeConfig(config)
      setEncodeResult(vpnUrl)
      if (vpnUrl.length > 4000) {
        setEncodeQrMessage(t('awg.qrTooLongEncode', { count: vpnUrl.length }))
      }
    } catch (e) {
      setEncodeError(
        t('awg.encodeError') + ': ' + (e instanceof Error ? e.message : String(e))
      )
    }
  }

  function clearEncode() {
    setEncodeInput('')
    setEncodeOutputVisible(false)
  }

  function copyResult(text: string, elId: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedbackId(elId)
      setTimeout(() => setCopyFeedbackId(null), 1500)
    })
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabName)}>
      <TabsList className="mb-6 w-full">
        <TabsTrigger value="decode" className="flex-1">{t('awg.tabDecode')}</TabsTrigger>
        <TabsTrigger value="encode" className="flex-1">{t('awg.tabEncode')}</TabsTrigger>
      </TabsList>

      <TabsContent value="decode" className="mt-0">
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awg.decodePrompt')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder={t('awg.decodePlaceholder')}
              spellCheck={false}
              className="min-h-[100px] font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={doDecode}>{t('awg.btnDecode')}</Button>
              <Button type="button" variant="secondary" onClick={clearDecode}>{t('awg.btnClear')}</Button>
            </div>
          </CardContent>
        </Card>
        {decodeOutputVisible && (
          <>
            {decodeError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{decodeError}</AlertDescription>
              </Alert>
            )}
            {decodeSuccess && (
              <Alert className="mb-4 border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
                <AlertDescription>{decodeSuccess}</AlertDescription>
              </Alert>
            )}
            {decodeInfoVisible && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('awg.paramsTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(decodeInfo).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-secondary/50 p-2.5">
                        <div className="mb-0.5 text-[0.7rem] uppercase tracking-wider text-muted-foreground">{esc(label)}</div>
                        <div className="break-all font-mono text-[0.82rem]">{esc(String(value))}</div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('awg.jsonTitle')}
                  </CardTitle>
                  <pre
                    id="decode-json"
                    className="max-h-[500px] overflow-auto rounded-lg border border-border bg-secondary/50 p-4 font-mono text-[0.78rem] leading-relaxed"
                  >
                    {decodeJson}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyResult(decodeJson, 'decode-json')}
                    >
                      {t('awg.copyJson')}
                      <span className={cn('ml-1 text-xs text-green-500 transition-opacity', copyFeedbackId === 'decode-json' ? 'opacity-100' : 'opacity-0')}>
                        {t('awg.copied')}
                      </span>
                    </Button>
                  </div>
                  <Separator />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('awg.qrTitle')}
                  </CardTitle>
                  <div className="flex flex-col items-center gap-4 pt-4" ref={decodeQrRef} />
                  {decodeQrMessage && <p className="text-center text-xs text-muted-foreground">{decodeQrMessage}</p>}
                  <p className="text-center text-xs text-muted-foreground">{t('awg.qrHint')}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="encode" className="mt-0">
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awg.encodePrompt')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Textarea
              value={encodeInput}
              onChange={(e) => setEncodeInput(e.target.value)}
              rows={12}
              placeholder={t('awg.encodePlaceholder')}
              spellCheck={false}
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={doEncode}>{t('awg.btnEncode')}</Button>
              <Button type="button" variant="secondary" onClick={clearEncode}>{t('awg.btnClear')}</Button>
            </div>
          </CardContent>
        </Card>
        {encodeOutputVisible && (
          <>
            {encodeError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{encodeError}</AlertDescription>
              </Alert>
            )}
            {encodeResult && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('awg.vpnStringTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <pre
                    className="max-h-[500px] overflow-auto rounded-lg border border-border bg-secondary/50 p-4 font-mono text-[0.72rem] leading-relaxed"
                    id="encode-result"
                  >
                    {encodeResult}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyResult(encodeResult, 'encode-result')}
                    >
                      {t('awg.copy')}
                      <span className={cn('ml-1 text-xs text-green-500 transition-opacity', copyFeedbackId === 'encode-result' ? 'opacity-100' : 'opacity-0')}>
                        {t('awg.copied')}
                      </span>
                    </Button>
                  </div>
                  <Separator />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('awg.qrTitleShort')}
                  </CardTitle>
                  <div className="flex flex-col items-center gap-4 pt-4" ref={encodeQrRef} />
                  {encodeQrMessage && <p className="text-center text-xs text-muted-foreground">{encodeQrMessage}</p>}
                  <p className="text-center text-xs text-muted-foreground">{t('awg.qrHint')}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
