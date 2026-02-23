# Sampo Forge — agent context

## About the project

**Sampo Forge** is a web app: a set of utilities — decoding Amnezia configs (vpn://), proxy subscriptions (ss, vmess, vless, trojan, etc.), and generating Mihomo/Clash and AWG (AmneziaWG) configs.

## Stack

- React 19, Vite 7, TypeScript (strict), Tailwind 4, shadcn/ui (Radix UI, CVA, `cn()` from `@/lib/utils`), lucide-react
- Path alias: `@/` → `src/`

## Structure

- **src/App.tsx** — routing (React Router). Routes: `/`, `/proxy-toolkit`, `/awg-qr-generator`, `/awg-config-generator`, `/mihomo-config-generator`.
- **src/components/ui/** — shadcn components (Button, Card, Select, Tabs, Dialog, Alert, Input, Textarea, Label, Badge, Collapsible, ScrollArea, Tooltip, Separator, Switch, Checkbox, etc.).
- **src/lib/utils.ts** — `cn()` for merging class names.
- **src/routes/<feature>/** — page, components, and optionally a reducer per feature.
- **src/lib/** — shared logic: `mihomo/` (parser, types, yaml-gen, yaml-import, state-helpers, state-serializer, decode-subscription, topology-data, validators, constants), `proxy-explain.ts`, `wireguard-config.ts`, `amnezia-config.ts`, `qr.ts`.
- **src/i18n/** — context and `useTranslation()`; locales in `src/locales/ru.json`, `en.json`.

**mihomo-config-generator** (`src/routes/mihomo-config-generator/`): main page component plus `components/` — ProxyLinksInput, Base64Import, AmneziaWgImport, Subscriptions, ProxyGroups, GeoRules, RuleProviders, ManualRules, RuleOrder, YamlOutput, ImportConfigDialog, ServiceTemplates, GeneralSettingsPanel, DnsSettingsPanel, Listeners, ConfigTopology, DemoPresets; state in `mihomoReducer.ts`.

## Terms

- **Mihomo** — Clash-compatible core (YAML config: proxies, proxy-groups, rules).
- **AWG** — Amnezia WireGuard.
- **Subscriptions** — base64 or set of proxy links (ss://, vmess://, vless://, trojan://, etc.).

## Status

Development stage. Do not overcomplicate architecture without explicit user request.
