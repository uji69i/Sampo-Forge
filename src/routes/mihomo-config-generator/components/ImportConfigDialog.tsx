import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { parseYamlToState } from '@/lib/mihomo/yaml-import'
import type { MihomoState } from '@/lib/mihomo/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImportConfigDialogProps {
  onClose: () => void
  onApply: (payload: Partial<MihomoState>) => void
}

export function ImportConfigDialog({ onClose, onApply }: ImportConfigDialogProps) {
  const { t } = useTranslation()
  const [yamlText, setYamlText] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const handleApply = () => {
    const trimmed = yamlText.trim()
    if (!trimmed) {
      setErrors([t('mihomo.importDialogHint')])
      return
    }
    const { state: parsed, errors: parseErrors } = parseYamlToState(trimmed)
    setErrors(parseErrors)
    if (parseErrors.length > 0 && (!parsed || Object.keys(parsed).length === 0)) return
    if (parsed && Object.keys(parsed).length > 0) {
      onApply(parsed)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle id="import-dialog-title">{t('mihomo.importDialogTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('mihomo.importDialogHint')}</p>
        <Textarea
          value={yamlText}
          onChange={(e) => setYamlText(e.target.value)}
          placeholder="proxies:&#10;  - name: ..."
          spellCheck={false}
          rows={12}
          className="font-mono text-sm"
        />
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong className="mb-1 block">{t('mihomo.importErrors')}</strong>
              <ul className="list-inside list-disc space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('mihomo.cancelButton')}
          </Button>
          <Button type="button" onClick={handleApply} className="bg-green-600 hover:bg-green-700">
            {t('mihomo.applyButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
