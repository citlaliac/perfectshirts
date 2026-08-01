# perfect t shirts

Intentionally crude catalog website for Perfect T Shirts. The site shows shirts and prices; **checkout happens on Etsy**.

## What this site does

- Lists shirts with photo, name, and price
- Each **Buy on Etsy** link opens that shirt’s exact Etsy listing in a new tab
- Tells the buyer they are leaving this site to pay on Etsy

## What this site does not do

- No cart, Stripe, Printify API, database, or order emails
- Etsy handles payment, taxes, confirmation, tracking, and records
- Printify (connected to Etsy) handles printing and shipping

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run validate:products   # catalog sanity checks
npm run lint
npm run build               # writes static files to out/
npm run check               # validate + lint + build
```

## Adding or updating a shirt

1. Put the mockup/photo in `public/shirts/`.
2. Edit `src/data/products.ts` and add/update an entry:

```ts
{
  slug: "my-shirt",
  name: "My Shirt",
  description: "Short description.",
  priceCents: 2499, // $24.99
  imageSrc: "/shirts/my-shirt.jpg",
  imageAlt: "My Shirt on a hanger",
  sizesSummary: "S, M, L, XL",
  colorsSummary: "Black, White",
  etsyUrl: "https://www.etsy.com/listing/1234567890/my-shirt",
  isPlaceholder: false,
}
```

3. Set `isPlaceholder` to `false` once the Etsy listing is live.
4. Run `npm run validate:products`.
5. Commit and push to `main` to deploy (after GitHub Actions secrets are configured).

## Deployment (GitHub → PlanetHoster)

Pushes to `main` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which mirrors the proven citla.li FTP-to-PlanetHoster setup:

1. Test the FTP connection (also runnable alone via **Test mode**)
2. Install dependencies
3. Validate products
4. Lint
5. Build static site into `out/`
6. Upload `out/` to PlanetHoster with `lftp mirror`

### GitHub Actions secrets to add

Same names/format as citla.li, plus a per-site target folder:

| Secret | Example / notes |
| --- | --- |
| `FTP_SERVER` | N0C host, e.g. `node36-ca.n0c.com` (no `ftp://` prefix) |
| `FTP_USERNAME` | Full N0C form, e.g. `user@perfectshirts.tld` |
| `FTP_PASSWORD` | Account/FTP password (no trailing spaces/newlines) |
| `FTP_REMOTE_DIR` | This site's document root. Since it is separate from citla.li, this is usually the addon-domain or subdomain folder, not the main `public_html` |

Do **not** commit credentials into the repository.

### Human setup checklist

1. Create the GitHub repo (e.g. `citlaliac/perfectshirts`) and push `main`.
2. In PlanetHoster N0C, add this site as an addon domain or subdomain and note its document root folder.
3. Add the four `FTP_*` secrets in GitHub → Settings → Secrets and variables → Actions.
4. Run the workflow with **Test mode** on to confirm the FTP connection and folder.
5. Turn Test mode off (or push to `main`) and confirm the site loads.

## Placeholders

Phase 1 ships with two fake shirts (`Mystery Meatball Tee`, `Extremely Normal Cat`) so the framework can be reviewed before real Etsy listings exist. Replace them when ready.
