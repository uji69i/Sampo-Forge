import { useState } from 'react'
import { useTranslation } from '@sampo-forge/shared/i18n/useTranslation'
import type { Listener, ListenerType } from '@sampo-forge/shared/lib/mihomo/types'
import { Card, CardHeader, CardTitle, CardContent } from '@sampo-forge/shared/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@sampo-forge/shared/ui/collapsible'
import { Switch } from '@sampo-forge/shared/ui/switch'
import { Label } from '@sampo-forge/shared/ui/label'
import { Input } from '@sampo-forge/shared/ui/input'
import { Button } from '@sampo-forge/shared/ui/button'
import { Textarea } from '@sampo-forge/shared/ui/textarea'
import { Checkbox } from '@sampo-forge/shared/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sampo-forge/shared/ui/select'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

const LISTENER_TYPES: ListenerType[] = [
  'http', 'socks', 'mixed', 'redirect', 'tproxy', 'tun', 'shadowsocks', 'vmess', 'vless', 'trojan', 'tuic', 'hysteria2', 'tunnel',
]

interface ListenersProps {
  listeners: Listener[]
  useListeners: boolean
  useAdvancedListenersYaml: boolean
  advancedListenersYaml: string
  policyOptions: Array<{ value: string; label: string }>
  onUseToggle: (enabled: boolean) => void
  onAddListener: (listener: Listener, autoBind?: boolean) => void
  onUpdateListener: (index: number, patch: Partial<Listener>) => void
  onRemoveListener: (index: number) => void
  onAdvancedYamlChange: (value: string) => void
  onAdvancedToggle: (enabled: boolean) => void
}

export function Listeners({
  listeners,
  useListeners,
  useAdvancedListenersYaml,
  advancedListenersYaml,
  policyOptions,
  onUseToggle,
  onAddListener,
  onUpdateListener,
  onRemoveListener,
  onAdvancedYamlChange,
  onAdvancedToggle,
}: ListenersProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [newType, setNewType] = useState<ListenerType>('mixed')
  const [autoBind, setAutoBind] = useState(true)

  const handleAdd = () => {
    const name = `listener-${listeners.length + 1}`
    const port = 7000 + listeners.length
    onAddListener({ name, type: newType, port, listen: '0.0.0.0', udp: newType === 'mixed' || newType === 'socks' }, autoBind)
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{t('mihomo.listenersTitle')}</CardTitle>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Switch checked={useListeners} onCheckedChange={onUseToggle} />
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </div>
            </CardHeader>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground">{t('mihomo.listenersSub')}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('mihomo.listenersAdvancedYaml')}</span>
              <Switch checked={useAdvancedListenersYaml} onCheckedChange={onAdvancedToggle} />
            </div>
            {useAdvancedListenersYaml ? (
              <Textarea value={advancedListenersYaml} onChange={(e) => onAdvancedYamlChange(e.target.value)} className="font-mono text-sm" spellCheck={false} rows={12} placeholder="listeners:\n  - name: mixed-in\n    type: mixed\n    port: 7080\n    listen: 0.0.0.0\n    udp: true" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('mihomo.listenersType')}</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as ListenerType)}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{LISTENER_TYPES.map((ty) => <SelectItem key={ty} value={ty}>{ty}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="autobind" checked={autoBind} onCheckedChange={(v) => setAutoBind(Boolean(v))} />
                    <Label htmlFor="autobind" className="cursor-pointer text-sm">{t('mihomo.listenersAutoBind')}</Label>
                  </div>
                  <Button type="button" onClick={handleAdd}>{t('mihomo.listenersAddButton')}</Button>
                </div>
                <div className="space-y-3">
                  {listeners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('mihomo.listenersEmpty')}</p>
                  ) : (
                    listeners.map((l, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input type="text" value={l.name} onChange={(e) => onUpdateListener(idx, { name: e.target.value.trim() || l.name })} placeholder={t('mihomo.listenersNamePlaceholder')} className="flex-1 min-w-[120px]" />
                          <Select value={l.type} onValueChange={(v) => onUpdateListener(idx, { type: v as ListenerType })}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{LISTENER_TYPES.map((ty) => <SelectItem key={ty} value={ty}>{ty}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveListener(idx)} aria-label={t('mihomo.remove')}>×</Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Label className="text-sm text-muted-foreground">{t('mihomo.listenersPort')}</Label>
                          <Input type="number" min={1} max={65535} value={l.port} onChange={(e) => onUpdateListener(idx, { port: parseInt(e.target.value, 10) || 0 })} className="w-24" />
                          <Label className="text-sm text-muted-foreground">{t('mihomo.listenersListen')}</Label>
                          <Input type="text" value={l.listen} onChange={(e) => onUpdateListener(idx, { listen: e.target.value.trim() || '0.0.0.0' })} placeholder="0.0.0.0" className="flex-1 min-w-[100px]" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox id={`udp-${idx}`} checked={l.udp ?? false} onCheckedChange={(v) => onUpdateListener(idx, { udp: Boolean(v) })} />
                            <Label htmlFor={`udp-${idx}`} className="cursor-pointer text-sm">{t('mihomo.listenersUdp')}</Label>
                          </div>
                          <Label className="text-sm text-muted-foreground">{t('mihomo.listenersProxy')}</Label>
                          <Select value={l.proxy ?? 'empty'} onValueChange={(v) => onUpdateListener(idx, { proxy: v === 'empty' ? undefined : v })}>
                            <SelectTrigger className="flex-1 min-w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent><SelectItem value="empty">—</SelectItem>{policyOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
