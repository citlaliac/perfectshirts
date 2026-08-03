# perfect shirts

Minimal catalog website. Shows shirts and prices; **checkout happens on Etsy**.

## What this site does

- Lists shirts with front (and back-on-hover) photos, name, and price
- **Buy on Etsy** / title links open the Etsy shop in a new tab
- Optional: sync price + front/back mockups from the Printify API

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run validate:products
npm run lint
npm run build
npm run check
```

## Sync from Printify (price, front, back)

### Local (optional)

1. Copy [`.env.example`](.env.example) → `.env.local` and add your token + shop id
2. `npm run sync:printify -- --list-shops` then set `PRINTIFY_SHOP_ID`
3. `npm run sync:printify`

### Automatic (morning sync)

GitHub Actions runs [`.github/workflows/sync-printify.yml`](.github/workflows/sync-printify.yml) daily (~7am Eastern) and on demand.

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Notes |
| --- | --- |
| `PRINTIFY_API_TOKEN` | Same token as `.env.local` |
| `PRINTIFY_SHOP_ID` | Numeric shop id from `--list-shops` |

If anything changed, the action commits to `main`, which triggers the normal FTP deploy. You do not need to sync on your laptop unless you want to preview first.

## Manual shirt edits

Edit `src/data/products.ts` (or re-run sync). Fields: `slug`, `name`, `priceCents`, `imageSrc`, `imageBackSrc`, `etsyUrl`.

## Deployment (GitHub → FTP host)

Pushes to `main` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### GitHub Actions secrets

| Secret | Notes |
| --- | --- |
| `FTP_SERVER` | Host only (no `ftp://`) |
| `FTP_USERNAME` | FTP user (e.g. `support@perfectshirts.net`) |
| `FTP_PASSWORD` | Password (no trailing spaces/newlines) |
| `FTP_REMOTE_DIR` | e.g. `perfectshirts.net` |

Legal-pad style saved as git tag `style/legal-pad-2002`.
