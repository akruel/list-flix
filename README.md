# ListFlix

Aplicação React + Vite + Supabase para descoberta de filmes/séries e listas compartilhadas.

## Pré-requisitos

- Node.js 22+
- pnpm 11+
- Docker (para Supabase local em testes de RLS e E2E)
- Supabase CLI

## Instalação

```bash
pnpm install --frozen-lockfile
```

## Desenvolvimento

```bash
pnpm run dev
```

## Testes

### Unit + UI (rápido, sem Docker)

```bash
pnpm test
# ou
pnpm run test:unit-ui
```

### RLS / migrations (Supabase local real)

```bash
pnpm run test:rls
```

### E2E (Playwright + Supabase local real)

```bash
pnpm run test:e2e
```

## Observações de execução

- `npm test` não depende de Docker.
- `pnpm run test:rls` e `pnpm run test:e2e` exigem Docker ativo.
- Os wrappers de teste sobem/reaproveitam o stack local do Supabase automaticamente.

## Troubleshooting

### Docker indisponível

Se aparecer erro de daemon do Docker:

1. Inicie o Docker Desktop.
2. Rode novamente `pnpm run test:rls` ou `pnpm run test:e2e`.

### Stack local do Supabase em estado inconsistente

```bash
supabase stop
supabase start
```

### Browsers do Playwright ausentes

```bash
npx playwright install chromium
```
