import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { makeQR } from '@sampo-forge/shared/lib/qr'
import { decodeConfig } from '@sampo-forge/shared/lib/amnezia-config'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import { useLocalePath } from '@sampo-forge/shared/i18n/useLocalePath'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Button } from '@sampo-forge/shared/ui/button'
import { Textarea } from '@sampo-forge/shared/ui/textarea'
import { Alert, AlertDescription } from '@sampo-forge/shared/ui/alert'

const QR_MAX_LENGTH = 4000
const AMNEZIA_DOCS_URL =
  'https://docs.amnezia.org/documentation/instructions/new-amneziawg-selfhosted/'

/** AmneziaWG-specific keys in .conf (see AmneziaWG 2.0 docs) */
const AMNEZIAWG_CONF_KEYS =
  /\b(Jc|Jmin|Jmax|S1|S2|S3|S4|H1|H2|H3|H4|I1|I2|I3|I4|I5)\s*=/i

function isAmneziaConfig(text: string): boolean {
  if (text.startsWith('vpn://')) return true
  if (text.includes('\n')) {
    if (text.includes('[Interface]') && AMNEZIAWG_CONF_KEYS.test(text)) {
      return true
    }
    return false
  }
  const base64Like = /^[A-Za-z0-9_-]+$/.test(text)
  if (!base64Like) return false
  try {
    const config = decodeConfig(text)
    return (
      Array.isArray(config.containers) ||
      typeof config.hostName === 'string' ||
      typeof config.defaultContainer === 'string'
    )
  } catch {
    return false
  }
}

export function AwgQrGenerator() {
  const { t } = useTranslation()
  const localePath = useLocalePath()
  const [input, setInput] = useState('')
  const [outputVisible, setOutputVisible] = useState(false)
  const [error, setError] = useState('')
  const [qrTooLongMessage, setQrTooLongMessage] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [isAmneziaLike, setIsAmneziaLike] = useState<boolean | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      generatedText &&
      generatedText.length <= QR_MAX_LENGTH &&
      qrRef.current
    ) {
      makeQR(generatedText, qrRef.current)
    }
  }, [generatedText])

  function doGenerate() {
    setOutputVisible(true)
    setError('')
    setQrTooLongMessage(null)
    setGeneratedText(null)
    setIsAmneziaLike(null)

    const trimmed = input.trim()
    if (!trimmed) {
      setError(t('awgQr.errorEmpty'))
      return
    }

    setIsAmneziaLike(isAmneziaConfig(trimmed))

    if (trimmed.length > QR_MAX_LENGTH) {
      setQrTooLongMessage(t('awgQr.qrTooLong', { count: trimmed.length }))
      return
    }

    setGeneratedText(trimmed)
  }

  function clearAll() {
    setInput('')
    setOutputVisible(false)
    setError('')
    setQrTooLongMessage(null)
    setGeneratedText(null)
    setIsAmneziaLike(null)
  }

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('awgQr.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('awgQr.subtitle')}</p>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('awgQr.prompt')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('awgQr.placeholder')}
            spellCheck={false}
            rows={12}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={doGenerate}>
              {t('awgQr.btnGenerate')}
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              {t('awgQr.btnClear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {outputVisible && (
        <>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isAmneziaLike === true && (
            <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
              <AlertDescription>
                <strong className="mb-1.5 block">{t('awgQr.amneziaWarningTitle')}</strong>
                <p className="mb-1">{t('awgQr.amneziaWarningBody')}</p>
                <p>
                  <Link to={localePath('/proxy-toolkit')} className="text-primary">
                    {t('common.tools.awgConfigDecoder')}
                  </Link>
                  {' · '}
                  <a
                    href={AMNEZIA_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    {t('awgQr.amneziaDocsLink')}
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          )}

          {(generatedText || qrTooLongMessage) && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('awgQr.qrTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center gap-4 pt-4" ref={qrRef} />
                {qrTooLongMessage && (
                  <p className="text-center text-xs text-muted-foreground">{qrTooLongMessage}</p>
                )}
                {generatedText && !isAmneziaLike && (
                  <p className="text-center text-xs text-muted-foreground">{t('awgQr.qrHint')}</p>
                )}
                {generatedText && isAmneziaLike === true && (
                  <p className="text-center text-xs text-muted-foreground">{t('awgQr.amneziaHint')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
