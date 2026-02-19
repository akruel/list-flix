# ListFlix

Aplicação React + Vite + Supabase para descoberta de filmes/séries e listas compartilhadas.

## Pré-requisitos

- Node.js 22+
- npm 10+
- Docker (para Supabase local em testes de RLS e E2E)
- Supabase CLI

## Instalação

```bash
npm ci
```

## Desenvolvimento

```bash
npm run dev
```

## Testes

### Unit + UI (rápido, sem Docker)

```bash
npm test
# ou
npm run test:unit-ui
```

### RLS / migrations (Supabase local real)

```bash
npm run test:rls
```

### E2E (Playwright + Supabase local real)

```bash
npm run test:e2e
```

## Observações de execução

- `npm test` não depende de Docker.
- `npm run test:rls` e `npm run test:e2e` exigem Docker ativo.
- Os wrappers de teste sobem/reaproveitam o stack local do Supabase automaticamente.

## Troubleshooting

### Docker indisponível

Se aparecer erro de daemon do Docker:

1. Inicie o Docker Desktop.
2. Rode novamente `npm run test:rls` ou `npm run test:e2e`.

### Stack local do Supabase em estado inconsistente

```bash
supabase stop
supabase start
```

### Browsers do Playwright ausentes

```bash
npx playwright install chromium
```
