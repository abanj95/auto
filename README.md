# McRowin Auto

Used-car dealership website. See [CLAUDE.md](CLAUDE.md) for the product summary, stack, layout and rules.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase values
pnpm dev
```

## Scripts

| Script           | What it does                |
| ---------------- | --------------------------- |
| `pnpm dev`       | Start the dev server        |
| `pnpm build`     | Production build            |
| `pnpm lint`      | ESLint                      |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm format`    | Prettier (writes changes)   |
| `pnpm test:e2e`  | Playwright smoke tests      |
