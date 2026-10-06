# Mida Restaurant

Restaurant ordering demo with customer, staff/kitchen and multi-restaurant platform screens. Supports French, Arabic and English.

Live demo: https://elmokanass4-dev.github.io/mida-restaurant/

## Run locally

Use Node.js 22.12+ (or 24+) and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

No API key is required for this demo. Data is stored in browser local storage. Orders and settings are not shared between devices; staff and platform screens have no production authentication. Use sample data only.

## Build and publish

```sh
pnpm lint
pnpm build
```

GitHub Pages serves the built `dist` contents from the `gh-pages` branch, at its root. The Vite base is `/mida-restaurant/`. Commit source updates to `main`, then publish the new build:

```sh
pnpm dlx gh-pages -d dist --dotfiles
```

The initial deployment includes `.nojekyll`. Keep it in `public` so future builds include it. GitHub repository Settings > Pages must use `gh-pages` and `/ (root)`.
