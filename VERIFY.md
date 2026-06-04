# Map Verify

Last updated: 2026-06-04

## Minimum Local Verification

```bash
npm run build
```

For Vercel function bundling parity:

```bash
npm run vercel-build
```

Use TypeScript when changing API or shared menu helpers:

```bash
npx tsc --noEmit
```

## Preview Smoke

```bash
npm run preview -- --host 127.0.0.1 --port 4140
```

Check these paths:

- `http://127.0.0.1:4140/`
- `http://127.0.0.1:4140/menu`
- `http://127.0.0.1:4140/menu?mbti=INFP`
- `http://127.0.0.1:4140/robots.txt`
- `http://127.0.0.1:4140/sitemap.xml`
- `http://127.0.0.1:4140/llms.txt`

Note: Vite preview does not fully emulate Vercel serverless API behavior. API checks should use Vercel preview/local tooling or deployed preview when serverless behavior is touched.

## API Checks

When API functions are available through Vercel tooling or deployed preview, check:

- `GET /api/menu`
- `GET /api/menu?mbti=INFP`
- `GET /api/mbti-dessert?mbti=INFP`
- `POST /api/map-order` rejects missing/unauthorized payloads.

Expected menu behavior:

- Successful payload has `success: true`, `data` array, and a `source` field.
- If Supabase canonical source is unavailable, fallback behavior is explicit.
- Static fallback still renders a usable menu.

## Browser Checks

- Landing page renders without blank screen.
- `/menu` renders as a full catalog, not only a modal.
- Product images and option ordering match current menu expectations.
- Adding items to cart does not change unrelated quantities.
- Checkout modal preserves item quantity/order.
- Submit flow builds a LINE handoff message.
- Failed DB/API order persistence still sends the user toward LINE preorder handoff.
- Cross-site links point to current domains: `kiwimu.com`, `shop.kiwimu.com`, `passport.kiwimu.com`, `gacha.kiwimu.com`.

## Production Smoke

After deploy, verify:

- `https://map.kiwimu.com/`
- `https://map.kiwimu.com/menu`
- `https://map.kiwimu.com/menu?mbti=INFP`
- `https://map.kiwimu.com/api/menu`
- `https://map.kiwimu.com/api/mbti-dessert?mbti=INFP`
- `https://map.kiwimu.com/robots.txt`
- `https://map.kiwimu.com/sitemap.xml`
- `https://map.kiwimu.com/llms.txt`

Full operations smoke:

- Live menu loads from Supabase or documented fallback.
- Cart can create a LINE preorder handoff.
- `api/map-order` writes the expected canonical order when env and trusted request checks are satisfied.
- Discord order notification receives expected payload.
- GA4 records menu/order funnel events.

## Release Gate

Before push:

```bash
git diff --check
npm run build
```

Before running `npm run deploy`, get explicit production deploy approval because the script runs `vercel deploy --prebuilt --prod`.
