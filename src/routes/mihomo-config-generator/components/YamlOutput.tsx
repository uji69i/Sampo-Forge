import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { minimalSetup } from 'codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { buildFullConfig } from '@/lib/mihomo/yaml-gen'
import { parseYamlToState } from '@/lib/mihomo/yaml-import'
import type { MihomoState } from '@/lib/mihomo/types'
import type { MihomoAction } from '../mihomoReducer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface YamlOutputProps {
  state: MihomoState
  status: 'idle' | 'ok' | 'error'
  statusText: string
  dispatch: React.Dispatch<MihomoAction>
  onShare?: () => void
}

function getOverrides(state: MihomoState): Parameters<typeof buildFullConfig>[1] {
  const overrides: Parameters<typeof buildFullConfig>[1] = {}
  if (state.useAdvancedSubsYaml && state.advancedSubsYaml)
    overrides.advancedSubsYaml = state.advancedSubsYaml
  if (state.useAdvancedGroupsYaml && state.advancedGroupsYaml)
    overrides.advancedGroupsYaml = state.advancedGroupsYaml
  if (state.useAdvancedRulesYaml && state.advancedRulesYaml)
    overrides.advancedRulesYaml = state.advancedRulesYaml
  return overrides
}

export function YamlOutput({ state, status, statusText, dispatch, onShare }: YamlOutputProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [editingYaml, setEditingYaml] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fullscreenWrapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isProgrammaticUpdateRef = useRef(false)

  const overrides = getOverrides(state)
  const generatedYaml = buildFullConfig(state, overrides)
  const displayValue = editingYaml !== null ? editingYaml : generatedYaml

  const updateEditorContent = useCallback((text: string) => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === text) return
    isProgrammaticUpdateRef.current = true
    view.dispatch({ changes: { from: 0, to: current.length, insert: text } })
    isProgrammaticUpdateRef.current = false
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const startContent = displayValue || ''
    const editorState = EditorState.create({
      doc: startContent,
      extensions: [
        minimalSetup,
        yaml(),
        oneDark,
        EditorView.updateListener.of((vu) => {
          if (!vu.docChanged) return
          if (isProgrammaticUpdateRef.current) return
          setEditingYaml(vu.state.doc.toString())
        }),
      ],
    })
    const view = new EditorView({ state: editorState, parent: containerRef.current })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    if (editingYaml === null) updateEditorContent(displayValue)
  }, [editingYaml, displayValue, updateEditorContent])

  useEffect(() => {
    if (!isFullscreen) return
    const id = requestAnimationFrame(() => viewRef.current?.requestMeasure())
    return () => cancelAnimationFrame(id)
  }, [isFullscreen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDownload = () => {
    const blob = new Blob([displayValue], { type: 'application/yaml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'config.yaml'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleApply = () => {
    const text = editingYaml ?? generatedYaml
    const { state: parsed, errors } = parseYamlToState(text)
    setImportErrors(errors)
    if (Object.keys(parsed).length === 0 && errors.length > 0) return
    if (parsed && Object.keys(parsed).length > 0) {
      dispatch({ type: 'IMPORT_YAML', payload: parsed })
      setEditingYaml(null)
    }
  }

  const handleReset = () => {
    setEditingYaml(null)
    setImportErrors([])
  }

  const handleShare = async () => {
    if (onShare) {
      onShare()
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  const isEditing = editingYaml !== null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('mihomo.outputTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('mihomo.outputSub')}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={fullscreenWrapRef} className={isFullscreen ? 'fixed inset-4 z-50 rounded-lg border border-border bg-card p-4' : ''}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="bg-green-600/20 hover:bg-green-600/30 text-green-600 dark:text-green-400" onClick={handleCopy}>
                {t('mihomo.copyButton')} {copied ? ` — ${t('mihomo.copied')}` : ''}
              </Button>
              <Button size="sm" onClick={handleDownload}>{t('mihomo.downloadButton')}</Button>
              {onShare && (
                <Button size="sm" variant="ghost" onClick={handleShare}>
                  {t('mihomo.shareButton')} {shareCopied ? ` — ${t('mihomo.shareCopied')}` : ''}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(true)}>{t('mihomo.fullscreenButton')}</Button>
              {isFullscreen && (
                <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(false)}>{t('mihomo.exitFullscreenButton')}</Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApply}>{t('mihomo.applyButton')}</Button>
                  <Button size="sm" variant="ghost" onClick={handleReset}>{t('mihomo.resetButton')}</Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>{status}</Badge>
              <span>{statusText}</span>
            </div>
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong className="block mb-1">{t('mihomo.importErrors')}</strong>
                  <ul className="list-inside list-disc space-y-0.5">
                    {importErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div ref={containerRef} className="rounded-lg border border-border overflow-hidden min-h-[200px]" data-placeholder={!displayValue} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
