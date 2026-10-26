# SAVORLEN website

A static, multi-page website for SAVORLEN, built with plain HTML, CSS, and JavaScript. There is no build step and no framework.

## Structure

```text
.
├── index.html
├── about.html
├── contact.html
├── privacy-policy.html
├── terms.html
├── 404.html
├── products/
│   ├── index.html
│   └── product.html
├── admin/
│   ├── index.html
│   └── config.yml
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── main.js
│   │   ├── navigation.js
│   │   └── products.js
│   ├── fonts/
│   ├── images/
│   └── logos/
├── _data/products.json
├── _headers
├── _redirects
├── netlify.toml
├── robots.txt
├── sitemap.xml
├── manifest.webmanifest
└── Input/                 # Source brief and original logo files; not public
```

## Local preview

Serve the repository root over HTTP rather than opening the HTML files directly. The catalogue fetches `/_data/products.json`, so `file://` URLs will not work.

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173/`.

## Content management

The site uses Decap CMS with the Netlify Git Gateway backend. The configuration assumes:

- The site is hosted on Netlify.
- Netlify Identity is enabled and set to invite-only.
- Git Gateway is enabled.
- The production branch is `main`.
- Netlify publishes the repository root with no build command.

To manage products:

1. Sign in at `/admin/`.
2. Open **Products → Product catalogue**.
3. Add or edit entries.
4. Use the editorial workflow: save a draft, move it to review, then publish.

`_data/products.json` is the single source of product data. The public catalogue reads it directly; no rebuild is required after publishing.

### Product fields

- **Product name** — required.
- **URL slug** — required; lowercase letters, numbers, and single hyphens only.
- **Product image** — optional. A branded fallback is used when absent.
- **Description** — optional. Keep it factual and approved.
- **Price** — optional. Shown only when a valid price and currency are present.
- **Currency** — three-letter code; `INR` is the provisional default.
- **Original price** — optional. Shown only when a current price exists and this value is higher.
- **Inventory status** — `in_stock`, `out_of_stock`, or `quantity`.
- **Quantity** — internal only; never displayed publicly.
- **Category** — optional; products sharing a category get a catalogue filter.

The site does not assume a product is in stock. A missing or unrecognised inventory value displays “Availability not published”. Numeric quantities are never exposed.

### Illustrative JSON shape

This shows the file structure only. Do not publish placeholder products.

```json
{
  "products": [
    {
      "name": "Example product",
      "slug": "example-product",
      "image": "/assets/images/products/example.jpg",
      "description": "Approved product description.",
      "price": 250,
      "currency": "INR",
      "slashed_price": 300,
      "inventory": "in_stock",
      "quantity": 12,
      "category": "Spice blends"
    }
  ]
}
```

## Provisional domain

The site currently uses `https://savorlen.com` as a provisional production domain. Replace it before launch if the final domain differs. Search the repository for `savorlen.com` and update:

- Canonical, Open Graph, and Twitter URLs in every HTML page.
- `SITE_URL` in `assets/js/products.js`.
- `robots.txt`.
- `sitemap.xml`.
- `site_url` and `logo_url` in `admin/config.yml`.

## Before launch

- [ ] Confirm and replace the provisional domain.
- [ ] Review the privacy policy and terms with a qualified adviser; both are plain-language drafts, not legal advice.
- [ ] Add approved product data and images. Remove any test entries.
- [ ] Confirm pricing, currency, and whether prices should be public at all.
- [ ] Confirm product descriptions, ingredients, allergens, storage, and usage wording.
- [ ] Test the Netlify Identity invitation and Git Gateway login flow.
- [ ] Publish a test draft through the editorial workflow and confirm it appears on the live catalogue.
- [ ] Confirm the final hosting branch and update `admin/config.yml` if it is not `main`.
- [ ] Run the responsive and accessibility checks below.
- [ ] Confirm that no private briefs, logos, or notes are publicly reachable.

## Responsive and accessibility checks

Test at approximately 320, 360, 390, 768, 1024, and 1440 CSS pixels. Check:

- No horizontal overflow.
- Header and mobile navigation work with touch, keyboard, and Escape.
- Product names and prices do not clip.
- Focus states are visible.
- Catalogue loading, empty, error, and filtered-empty states are readable.
- Product detail works when opened directly with a valid and invalid `?slug=`.
- Pages remain readable with JavaScript disabled, apart from the dynamic catalogue and product detail.
- Reduced-motion preference disables reveal animations.

## Security and deployment files

- `_headers` sets baseline security headers and cache rules.
- `_redirects` blocks `Input/`, `README.md`, and forces a 404 response for those paths.
- `netlify.toml` sets the publish directory to the repository root.
- Public pages include a restrictive Content Security Policy meta tag.
- The admin area is excluded from search indexing and does not receive the public-page CSP meta tag.

## Known limitations

- Product detail URLs use a query string (`/products/product.html?slug=...`) and are marked `noindex`. They are excluded from the sitemap. Indexable product pages would require a build step or server-side rendering.
- The catalogue and product detail require JavaScript. A no-script fallback explains this and offers contact routes.
- The site has no analytics, advertising pixels, contact form, user accounts, or online checkout.
- CMS authentication and publishing cannot be verified until the repository is connected to Netlify and the Identity/Git Gateway settings are configured.

## Contact details used on the site

- Email: `main.savorlen@gmail.com`
- Phone and WhatsApp: `+91 98424 98324`
