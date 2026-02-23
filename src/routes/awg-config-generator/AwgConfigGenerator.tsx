import { useState, useCallback } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import {
  generateConfigs,
  validatePort,
  validateNumClients,
  validateCidr,
  generateRandomAwgParams,
  type GeneratedConfig,
  type AmneziaWGOptions,
  type AwgVersion,
} from '@/lib/wireguard-config'
import JSZip from 'jszip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

const DEFAULT_POST_UP =
  'iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE'
const DEFAULT_POST_DOWN =
  'iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE'

export type PostUpDownScenario = 'fullNAT' | 'lanOnly' | 'custom'

function buildNatIptables(outInterface: string) {
  const o = outInterface.trim() || 'eth0'
  return {
    postUp: `iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${o} -j MASQUERADE`,
    postDown: `iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${o} -j MASQUERADE`,
  }
}

function buildNatNftables(outInterface: string) {
  const o = outInterface.trim() || 'eth0'
  return {
    postUp: `nft add rule ip filter FORWARD iifname "%i" counter accept; nft add rule ip filter FORWARD oifname "%i" counter accept; nft add rule ip nat POSTROUTING oifname "${o}" counter masquerade`,
    postDown: `nft delete rule ip filter FORWARD iifname "%i" counter accept; nft delete rule ip filter FORWARD oifname "%i" counter accept; nft delete rule ip nat POSTROUTING oifname "${o}" counter masquerade`,
  }
}

function buildLanOnlyIptables(lanSubnet: string) {
  const sub = lanSubnet.trim() || '192.168.1.0/24'
  return {
    postUp: `iptables -I FORWARD 1 -o %i -m state --state ESTABLISHED,RELATED -j ACCEPT; iptables -I FORWARD 2 -i %i -d ${sub} -j ACCEPT; iptables -I FORWARD 3 -i %i -j REJECT`,
    postDown: `iptables -D FORWARD -o %i -m state --state ESTABLISHED,RELATED -j ACCEPT; iptables -D FORWARD -i %i -d ${sub} -j ACCEPT; iptables -D FORWARD -i %i -j REJECT`,
  }
}

function buildLanOnlyNftables(lanSubnet: string) {
  const sub = lanSubnet.trim() || '192.168.1.0/24'
  return {
    postUp: `nft add rule ip filter FORWARD oifname "%i" ct state established,related counter accept; nft add rule ip filter FORWARD iifname "%i" ip daddr ${sub} counter accept; nft add rule ip filter FORWARD iifname "%i" counter reject`,
    postDown: `nft delete rule ip filter FORWARD oifname "%i" ct state established,related counter accept; nft delete rule ip filter FORWARD iifname "%i" ip daddr ${sub} counter accept; nft delete rule ip filter FORWARD iifname "%i" counter reject`,
  }
}

function buildPresetScripts(
  scenario: PostUpDownScenario,
  outboundInterface: string,
  lanSubnet: string,
  useNftables: boolean
): { postUp: string; postDown: string } {
  if (scenario === 'fullNAT') {
    return useNftables ? buildNatNftables(outboundInterface) : buildNatIptables(outboundInterface)
  }
  if (scenario === 'lanOnly') {
    return useNftables ? buildLanOnlyNftables(lanSubnet) : buildLanOnlyIptables(lanSubnet)
  }
  return { postUp: '', postDown: '' }
}

/** Sample I1 obfuscation packet (QUIC) from Amnezia docs — format <b 0xHEX...> */
const SAMPLE_I1_QUIC =
  '<b 0xc70000000108ce1bf31eec7d93360000449e227e4596ed7f75c4d35ce31880b4133107c822c6355b51f0d7c1bba96d5c210a48aca01885fed0871cfc37d59137d73b506dc013bb4a13c060ca5b04b7ae215af71e37d6e8ff1db235f9fe0c25cb8b492471054a7c8d0d6077d430d07f6e87a8699287f6e69f54263c7334a8e144a29851429bf2e350e519445172d36953e96085110ce1fb641e5efad42c0feb4711ece959b72cc4d6f3c1e83251adb572b921534f6ac4b10927167f41fe50040a75acef62f45bded67c0b45b9d655ce374589cad6f568b8475b2e8921ff98628f86ff2eb5bcce6f3ddb7dc89e37c5b5e78ddc8d93a58896e530b5f9f1448ab3b7a1d1f24a63bf981634f6183a21af310ffa52e9ddf5521561760288669de01a5f2f1a4f922e68d0592026bbe4329b654d4f5d6ace4f6a23b8560b720a5350691c0037b10acfac9726add44e7d3e880ee6f3b0d6429ff33655c297fee786bb5ac032e48d2062cd45e305e6d8d8b82bfbf0fdbc5ec09943d1ad02b0b5868ac4b24bb10255196be883562c35a713002014016b8cc5224768b3d330016cf8ed9300fe6bf39b4b19b3667cddc6e7c7ebe4437a58862606a2a66bd4184b09ab9d2cd3d3faed4d2ab71dd821422a9540c4c5fa2a9b2e6693d411a22854a8e541ed930796521f03a54254074bc4c5bca152a1723260e7d70a24d49720acc544b41359cfc252385bda7de7d05878ac0ea0343c77715e145160e6562161dfe2024846dfda3ce99068817a2418e66e4f37dea40a21251c8a034f83145071d93baadf050ca0f95dc9ce2338fb082d64fbc8faba905cec66e65c0e1f9b003c32c943381282d4ab09bef9b6813ff3ff5118623d2617867e25f0601df583c3ac51bc6303f79e68d8f8de4b8363ec9c7728b3ec5fcd5274edfca2a42f2727aa223c557afb33f5bea4f64aeb252c0150ed734d4d8eccb257824e8e090f65029a3a042a51e5cc8767408ae07d55da8507e4d009ae72c47ddb138df3cab6cc023df2532f88fb5a4c4bd917fafde0f3134be09231c389c70bc55cb95a779615e8e0a76a2b4d943aabfde0e394c985c0cb0376930f92c5b6998ef49ff4a13652b787503f55c4e3d8eebd6e1bc6db3a6d405d8405bd7a8db7cefc64d16e0d105a468f3d33d29e5744a24c4ac43ce0eb1bf6b559aed520b91108cda2de6e2c4f14bc4f4dc58712580e07d217c8cca1aaf7ac04bab3e7b1008b966f1ed4fba3fd93a0a9d3a27127e7aa587fbcc60d548300146bdc126982a58ff5342fc41a43f83a3d2722a26645bc961894e339b953e78ab395ff2fb854247ad06d446cc2944a1aefb90573115dc198f5c1efbc22bc6d7a74e41e666a643d5f85f57fde81b87ceff95353d22ae8bab11684180dd142642894d8dc34e402f802c2fd4a73508ca99124e428d67437c871dd96e506ffc39c0fc401f666b437adca41fd563cbcfd0fa22fbbf8112979c4e677fb533d981745cceed0fe96da6cc0593c430bbb71bcbf924f70b4547b0bb4d41c94a09a9ef1147935a5c75bb2f721fbd24ea6a9f5c9331187490ffa6d4e34e6bb30c2c54a0344724f01088fb2751a486f425362741664efb287bce66c4a544c96fa8b124d3c6b9eaca170c0b530799a6e878a57f402eb0016cf2689d55c76b2a91285e2273763f3afc5bc9398273f5338a06d>'

/** I1–I5 must use format <b 0xHEX...> for AmneziaWG 1.0 (Legacy), not plain numbers */
function isBinaryObfuscationFormat(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  return t.startsWith('<b ') && t.includes('0x') && t.endsWith('>')
}

function hasLegacyFormatWarning(i1: string, i2: string, i3: string, i4: string, i5: string): boolean {
  return [i1, i2, i3, i4, i5].some((v) => v.trim() !== '' && !isBinaryObfuscationFormat(v))
}

export function AwgConfigGenerator() {
  const { t } = useTranslation()
  const [seed, setSeed] = useState('')
  const [listenPort, setListenPort] = useState('51820')
  const [numClients, setNumClients] = useState('3')
  const [cidr, setCidr] = useState('10.0.0.0/24')
  const [clientAllowedIPs, setClientAllowedIPs] = useState('0.0.0.0/0, ::/0')
  const [endpoint, setEndpoint] = useState('myserver.dyndns.org:51820')
  const [dns, setDns] = useState('')
  const [postUp, setPostUp] = useState(DEFAULT_POST_UP)
  const [postDown, setPostDown] = useState(DEFAULT_POST_DOWN)
  const [postUpDownScenario, setPostUpDownScenario] = useState<PostUpDownScenario>('fullNAT')
  const [outboundInterface, setOutboundInterface] = useState('eth0')
  const [lanSubnet, setLanSubnet] = useState('192.168.1.0/24')
  const [useNftables, setUseNftables] = useState(false)
  const [usePsk, setUsePsk] = useState(false)
  const [amneziaWG, setAmneziaWG] = useState(false)
  const [awgVersion, setAwgVersion] = useState<AwgVersion>('2.0')
  const [jc, setJc] = useState('')
  const [jmin, setJmin] = useState('')
  const [jmax, setJmax] = useState('')
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [s3, setS3] = useState('')
  const [s4, setS4] = useState('')
  const [h1, setH1] = useState('')
  const [h2, setH2] = useState('')
  const [h3, setH3] = useState('')
  const [h4, setH4] = useState('')
  const [i1, setI1] = useState('')
  const [i2, setI2] = useState('')
  const [i3, setI3] = useState('')
  const [i4, setI4] = useState('')
  const [i5, setI5] = useState('')

  const [configs, setConfigs] = useState<GeneratedConfig[]>([])
  const [error, setError] = useState('')
  const [copyId, setCopyId] = useState<string | null>(null)

  const copyToClipboard = useCallback(
    (text: string, id: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopyId(id)
        setTimeout(() => setCopyId(null), 1500)
      })
    },
    []
  )

  const downloadFile = useCallback((name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadAllZip = useCallback(async () => {
    if (configs.length === 0) return
    const zip = new JSZip()
    for (const c of configs) {
      zip.file(c.name, c.content)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wireguard-configs.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [configs])

  const handleGenerate = useCallback(async () => {
    setError('')
    setConfigs([])

    const port = parseInt(listenPort, 10)
    const clients = parseInt(numClients, 10)

    if (!validatePort(port)) {
      setError(t('awgGen.errorPort'))
      return
    }
    if (!validateNumClients(clients)) {
      setError(t('awgGen.errorClients'))
      return
    }
    if (!validateCidr(cidr)) {
      setError(t('awgGen.errorCidr'))
      return
    }

    const num = (s: string): number | undefined => {
      const n = parseInt(s.trim(), 10)
      return Number.isNaN(n) ? undefined : n
    }
    const amneziaOptions: AmneziaWGOptions | undefined = amneziaWG
      ? {
          version: awgVersion,
          Jc: num(jc),
          Jmin: num(jmin),
          Jmax: num(jmax),
          S1: num(s1),
          S2: num(s2),
          ...(awgVersion === '2.0' ? { S3: num(s3), S4: num(s4) } : {}),
          H1: num(h1),
          H2: num(h2),
          H3: num(h3),
          H4: num(h4),
          I1: i1.trim() || undefined,
          I2: i2.trim() || undefined,
          I3: i3.trim() || undefined,
          I4: i4.trim() || undefined,
          I5: i5.trim() || undefined,
        }
      : undefined

    try {
      const result = await generateConfigs({
        seed,
        listenPort: port,
        numClients: clients,
        cidr,
        clientAllowedIPs,
        endpoint,
        dns,
        postUp,
        postDown,
        usePsk,
        amneziaWG,
        amneziaOptions,
      })
      setConfigs(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [
    seed,
    listenPort,
    numClients,
    cidr,
    clientAllowedIPs,
    endpoint,
    dns,
    postUp,
    postDown,
    usePsk,
    amneziaWG,
    awgVersion,
    jc,
    jmin,
    jmax,
    s1,
    s2,
    s3,
    s4,
    h1,
    h2,
    h3,
    h4,
    i1,
    i2,
    i3,
    i4,
    i5,
    t,
  ])

  return (
    <div>
      <h1 className="mb-1 text-[1.6rem] font-bold">{t('awgGen.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t('awgGen.subtitle')}</p>

      <Alert className="mb-6 border-blue-500/30 bg-blue-500/10">
        <AlertDescription>{t('awgGen.infoBlock')}</AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.seed')}
            </Label>
            <Input
              type="text"
              className="mt-1.5 font-mono"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={t('awgGen.seedPlaceholder')}
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.listenPort')}</Label>
              <Input
                type="number"
                className="max-w-32 font-mono"
                value={listenPort}
                onChange={(e) => setListenPort(e.target.value)}
                min={1}
                max={65535}
              />
            </div>
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.numClients')}</Label>
              <Input
                type="number"
                className="max-w-32 font-mono"
                value={numClients}
                onChange={(e) => setNumClients(e.target.value)}
                min={1}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.cidr')}</Label>
              <Input
                type="text"
                className="font-mono"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="10.0.0.0/24"
              />
            </div>
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.clientAllowedIPs')}</Label>
              <Input
                type="text"
                className="font-mono"
                value={clientAllowedIPs}
                onChange={(e) => setClientAllowedIPs(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.endpoint')}</Label>
              <Input
                type="text"
                className="font-mono"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={t('awgGen.endpointPlaceholder')}
              />
            </div>
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <Label className="text-sm text-muted-foreground">{t('awgGen.dns')}</Label>
              <Input
                type="text"
                className="font-mono"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('awgGen.postUpDownDescription')}
          </p>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.postUpDownScenario')}
            </Label>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="postUpDownScenario"
                  checked={postUpDownScenario === 'fullNAT'}
                  onChange={() => {
                    setPostUpDownScenario('fullNAT')
                    const { postUp: u, postDown: d } = buildPresetScripts(
                      'fullNAT',
                      outboundInterface,
                      lanSubnet,
                      useNftables
                    )
                    setPostUp(u)
                    setPostDown(d)
                  }}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.scenarioFullNAT')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="postUpDownScenario"
                  checked={postUpDownScenario === 'lanOnly'}
                  onChange={() => {
                    setPostUpDownScenario('lanOnly')
                    const { postUp: u, postDown: d } = buildPresetScripts(
                      'lanOnly',
                      outboundInterface,
                      lanSubnet,
                      useNftables
                    )
                    setPostUp(u)
                    setPostDown(d)
                  }}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.scenarioLanOnly')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="postUpDownScenario"
                  checked={postUpDownScenario === 'custom'}
                  onChange={() => setPostUpDownScenario('custom')}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.scenarioCustom')}</span>
              </label>
            </div>
          </div>
          {(postUpDownScenario === 'fullNAT' || postUpDownScenario === 'lanOnly') && (
            <>
              {postUpDownScenario === 'fullNAT' && (
                <div className="flex flex-1 min-w-[140px] flex-col gap-1">
                  <Label className="text-sm text-muted-foreground">
                    {t('awgGen.outboundInterface')}
                  </Label>
                  <Input
                    type="text"
                    className="max-w-48 font-mono"
                    value={outboundInterface}
                    onChange={(e) => {
                      const v = e.target.value
                      setOutboundInterface(v)
                      const { postUp: u, postDown: d } = buildPresetScripts(
                        'fullNAT',
                        v,
                        lanSubnet,
                        useNftables
                      )
                      setPostUp(u)
                      setPostDown(d)
                    }}
                    placeholder={t('awgGen.outboundInterfacePlaceholder')}
                  />
                </div>
              )}
              {postUpDownScenario === 'lanOnly' && (
                <div className="flex flex-1 min-w-[140px] flex-col gap-1">
                  <Label className="text-sm text-muted-foreground">
                    {t('awgGen.lanSubnet')}
                  </Label>
                  <Input
                    type="text"
                    className="max-w-48 font-mono"
                    value={lanSubnet}
                    onChange={(e) => {
                      const v = e.target.value
                      setLanSubnet(v)
                      const { postUp: u, postDown: d } = buildPresetScripts(
                        'lanOnly',
                        outboundInterface,
                        v,
                        useNftables
                      )
                      setPostUp(u)
                      setPostDown(d)
                    }}
                    placeholder={t('awgGen.lanSubnetPlaceholder')}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useNftables"
                  checked={useNftables}
                  onCheckedChange={(checked) => {
                    const c = Boolean(checked)
                    setUseNftables(c)
                    if (postUpDownScenario === 'fullNAT' || postUpDownScenario === 'lanOnly') {
                      const { postUp: u, postDown: d } = buildPresetScripts(
                        postUpDownScenario,
                        outboundInterface,
                        lanSubnet,
                        c
                      )
                      setPostUp(u)
                      setPostDown(d)
                    }
                  }}
                />
                <Label htmlFor="useNftables" className="cursor-pointer text-sm">
                  {t('awgGen.useNftables')}
                </Label>
              </div>
            </>
          )}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.postUp')}
            </Label>
            <Textarea
              value={postUp}
              onChange={(e) => setPostUp(e.target.value)}
              rows={2}
              spellCheck={false}
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.postDown')}
            </Label>
            <Textarea
              value={postDown}
              onChange={(e) => setPostDown(e.target.value)}
              rows={2}
              spellCheck={false}
              className="mt-1.5 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="usePsk"
              checked={usePsk}
              onCheckedChange={(v) => setUsePsk(Boolean(v))}
            />
            <Label htmlFor="usePsk" className="cursor-pointer text-sm">{t('awgGen.usePsk')}</Label>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Checkbox
              id="amneziaWG"
              checked={amneziaWG}
              onCheckedChange={(v) => setAmneziaWG(Boolean(v))}
            />
            <Label htmlFor="amneziaWG" className="cursor-pointer text-sm">{t('awgGen.amneziaToggle')}</Label>
          </div>

        {amneziaWG && (
          <>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.protocolVersion')}
            </Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="awgVersion"
                  checked={awgVersion === '1.0'}
                  onChange={() => setAwgVersion('1.0')}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.versionLegacy')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="awgVersion"
                  checked={awgVersion === '1.5'}
                  onChange={() => setAwgVersion('1.5')}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.version15')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="awgVersion"
                  checked={awgVersion === '2.0'}
                  onChange={() => setAwgVersion('2.0')}
                  className="h-4 w-4"
                />
                <span>{t('awgGen.version20')}</span>
              </label>
            </div>

            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.awgNumericTitle')}
            </Label>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const params = generateRandomAwgParams(awgVersion)
                  setJc(String(params.Jc ?? ''))
                  setJmin(String(params.Jmin ?? ''))
                  setJmax(String(params.Jmax ?? ''))
                  setS1(String(params.S1 ?? ''))
                  setS2(String(params.S2 ?? ''))
                  if (awgVersion === '2.0') {
                    setS3(String(params.S3 ?? ''))
                    setS4(String(params.S4 ?? ''))
                  } else {
                    setS3('')
                    setS4('')
                  }
                  setH1(String(params.H1 ?? ''))
                  setH2(String(params.H2 ?? ''))
                  setH3(String(params.H3 ?? ''))
                  setH4(String(params.H4 ?? ''))
                }}
              >
                {t('awgGen.btnGenerateAwgParams')}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.jc')}</Label>
                <Input
                  type="number"
                  className="max-w-32 font-mono"
                  value={jc}
                  onChange={(e) => setJc(e.target.value)}
                  min={0}
                  max={10}
                  placeholder="4"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.jmin')}</Label>
                <Input type="number" className="max-w-32 font-mono" value={jmin} onChange={(e) => setJmin(e.target.value)} min={0} max={1024} placeholder="10" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.jmax')}</Label>
                <Input type="number" className="max-w-32 font-mono" value={jmax} onChange={(e) => setJmax(e.target.value)} min={0} max={1024} placeholder="50" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.s1')}</Label>
                <Input type="number" className="max-w-32 font-mono" value={s1} onChange={(e) => setS1(e.target.value)} min={0} max={64} placeholder="67" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.s2')}</Label>
                <Input type="number" className="max-w-32 font-mono" value={s2} onChange={(e) => setS2(e.target.value)} min={0} max={64} placeholder="145" />
              </div>
              {awgVersion === '2.0' && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.s3')}</Label>
                    <Input type="number" className="max-w-32 font-mono" value={s3} onChange={(e) => setS3(e.target.value)} min={0} max={64} placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.s4')}</Label>
                    <Input type="number" className="max-w-32 font-mono" value={s4} onChange={(e) => setS4(e.target.value)} min={0} max={64} placeholder="0" />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.h1')}</Label>
                <Input type="number" className="font-mono" value={h1} onChange={(e) => setH1(e.target.value)} placeholder="711265250" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.h2')}</Label>
                <Input type="number" className="font-mono" value={h2} onChange={(e) => setH2(e.target.value)} placeholder="1987653394" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.h3')}</Label>
                <Input type="number" className="font-mono" value={h3} onChange={(e) => setH3(e.target.value)} placeholder="949358272" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm text-muted-foreground">{t('awgGen.h4')}</Label>
                <Input type="number" className="font-mono" value={h4} onChange={(e) => setH4(e.target.value)} placeholder="1906918648" />
              </div>
            </div>

            {(awgVersion === '1.5' || awgVersion === '2.0') && (
              <>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('awgGen.cpsTitle')}
                </Label>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setI1(SAMPLE_I1_QUIC)}>
                    {t('awgGen.btnInsertSampleI1')}
                  </Button>
                </div>
                {hasLegacyFormatWarning(i1, i2, i3, i4, i5) && (
                  <Alert className="mb-4 border-amber-500/40 bg-amber-500/10" role="alert">
                    <AlertDescription>{t('awgGen.legacyFormatWarning')}</AlertDescription>
                  </Alert>
                )}
                <p className="mb-3 text-xs text-muted-foreground">{t('awgGen.awgHint')}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.i1')}</Label>
                    <Input type="text" className="font-mono" value={i1} onChange={(e) => setI1(e.target.value)} placeholder="<b 0x...>" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.i2')}</Label>
                    <Input type="text" className="font-mono" value={i2} onChange={(e) => setI2(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.i3')}</Label>
                    <Input type="text" className="font-mono" value={i3} onChange={(e) => setI3(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.i4')}</Label>
                    <Input type="text" className="font-mono" value={i4} onChange={(e) => setI4(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm text-muted-foreground">{t('awgGen.i5')}</Label>
                    <Input type="text" className="font-mono" value={i5} onChange={(e) => setI5(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleGenerate}>
              {t('awgGen.btnGenerate')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {configs.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('awgGen.resultsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" onClick={downloadAllZip}>
                {t('awgGen.downloadAllZip')}
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {configs.map((cfg) => (
                <div
                  key={cfg.name}
                  className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm">{cfg.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyToClipboard(cfg.content, cfg.name)}
                      >
                        {t('awgGen.copy')}
                        <span className={cn('ml-1 text-xs text-green-500 transition-opacity', copyId === cfg.name ? 'opacity-100' : 'opacity-0')}>
                          {t('awgGen.copied')}
                        </span>
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => downloadFile(cfg.name, cfg.content)}>
                        {t('awgGen.download')}
                      </Button>
                    </div>
                  </div>
                  <pre
                    id={`config-${cfg.name}`}
                    className="max-h-[500px] overflow-auto rounded-lg border border-border bg-secondary/50 p-4 font-mono text-[0.78rem] leading-relaxed"
                  >
                    {cfg.content}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
