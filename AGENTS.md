# Sampo Forge — agent context

## About the project

**Sampo Forge** is a web app: a set of utilities — decoding Amnezia configs (vpn://), proxy subscriptions (ss, vmess, vless, trojan, etc.), and generating Mihomo/Clash and AWG (AmneziaWG) configs.

## Stack

- React 19, Vite 7, TypeScript (strict), Tailwind 4, shadcn/ui (Radix UI, CVA, `cn()` from `@sampo-forge/shared`), lucide-react
- pnpm workspaces monorepo

## Structure (monorepo)

```
packages/
  shared/          (@sampo-forge/shared) — UI components (shadcn), lib (utils, mihomo parser, amnezia-config, wireguard-config, qr, proxy-explain), i18n, theme, locales
  home/            (@sampo-forge/home)
  proxy-toolkit/   (@sampo-forge/proxy-toolkit)
  awg-qr-generator/ (@sampo-forge/awg-qr-generator)
  awg-config-generator/ (@sampo-forge/awg-config-generator)
  mihomo-config-generator/ (@sampo-forge/mihomo-config-generator) — biggest package: main page, 16 sub-components, mihomoReducer
apps/
  web/             (@sampo-forge/web) — main app shell: routing, Layout, LocaleGuard, DocumentHead, Vite config, CSS
```

### Import conventions

- **Within a package**: relative paths (`./components/ProxyTable`)
- **Cross-package**: `@sampo-forge/shared/lib/utils`, `@sampo-forge/shared/ui/card`, `@sampo-forge/shared/i18n/useTranslation`
- **App -> route packages**: `@sampo-forge/home`, `@sampo-forge/proxy-toolkit`, etc.

### Key files

- **packages/shared/src/lib/** — shared logic: `mihomo/` (parser, types, yaml-gen, yaml-import, state-helpers, state-serializer, decode-subscription, topology-data, validators, constants), `proxy-explain.ts`, `wireguard-config.ts`, `amnezia-config.ts`, `qr.ts`
- **packages/shared/src/ui/** — shadcn components (Button, Card, Select, Tabs, Dialog, Alert, Input, Textarea, Label, Badge, Collapsible, ScrollArea, Tooltip, Separator, Switch, Checkbox)
- **packages/shared/src/i18n/** — context and `useTranslation()`; locales in `packages/shared/src/locales/`
- **apps/web/vite.config.ts** — Vite config with sitemap plugin, chunk splitting

## Terms

- **Mihomo** — Clash-compatible core (YAML config: proxies, proxy-groups, rules).
- **AWG** — Amnezia WireGuard.
- **Subscriptions** — base64 or set of proxy links (ss://, vmess://, vless://, trojan://, etc.).

## Status

Development stage. Do not overcomplicate architecture without explicit user request.
