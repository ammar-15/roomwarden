# Room Warden website

Marketing site for [roomwarden.com](https://roomwarden.com). Plain static HTML, CSS and a small JS file. No build step, no framework.

## Pages

- `index.html` home: hero with the live front desk board, features, workflow tabs, before/after, FAQ preview, blog teasers, demo form
- `faq.html` full FAQ (with FAQPage structured data)
- `blog.html` blog index
- `blog/*.html` posts

## Before going live

1. **Contact form.** Set `FORM_ENDPOINT` at the top of `app.js` (Formspree, Basin, or your own endpoint). While it's empty the form only shows the thank-you message and nothing is sent.
2. **Email.** `hello@roomwarden.com` is used in the footer, contact section and `llms.txt`. Change it if you use a different address.
3. **Privacy policy.** The form collects contact info, so add a privacy page and link it in the footer before launch.

## SEO / AEO / GEO

- Per-page title, description, canonical, Open Graph and Twitter tags
- JSON-LD: Organization, WebSite, SoftwareApplication (home), FAQPage (faq), Blog, BlogPosting, BreadcrumbList
- `sitemap.xml`, `robots.txt` (open to search and AI crawlers), `llms.txt`
- Every blog post opens with a short answer box so search and AI tools can pull a clean summary

## Deploy

Works on any static host. On Vercel, `vercel.json` turns on clean URLs (`/faq`, `/blog/...`), which is what the canonical tags and sitemap use.

To add a blog post: copy an existing file in `blog/`, update the content, title, description, date and JSON-LD, then add it to `blog.html`, the home page teasers, `sitemap.xml` and `llms.txt`.
