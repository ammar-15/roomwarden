# Room Warden website

Marketing site for [roomwarden.com](https://roomwarden.com), hosted on Cloudflare Workers.

- `public/` is the static site: plain HTML, CSS and one small JS file. No build step.
- `worker/index.js` is a small Worker. It handles `POST /api/contact` and emails each demo request to ammar@roomwardenadmin.com. Every other request is served straight from `public/`.
- `wrangler.jsonc` is the Cloudflare config.

## Deploy (one time)

1. Cloudflare dashboard, **Workers & Pages**, **Create**, **Import a repository**. Pick `ammar-15/roomwarden`. Keep the default deploy command (`npx wrangler deploy`). After that, every push to `main` deploys.
2. In the Worker's **Settings**, **Domains & Routes**, add `roomwarden.com` (and `www.roomwarden.com` if you want it).

## Turn on form emails (one time)

The form sends from `forms@roomwarden.com` to `ammar@roomwardenadmin.com`. Sending to your own verified address is free on any plan.

1. On the `roomwarden.com` zone, open **Email**, **Email Routing**, and turn it on.
2. Under **Destination addresses**, add `ammar@roomwardenadmin.com` and click the verification link Cloudflare emails you.

To send from a different address, change `CONTACT_FROM` in `wrangler.jsonc`. It must be on a domain in your Cloudflare account with Email Routing on.

## Local dev

```
npm install
npm run dev
```

`wrangler dev` simulates the email binding locally, so test submissions are written to `.wrangler/` instead of being sent.

## SEO / AEO / GEO

- Per-page title, description, canonical, Open Graph and Twitter tags
- JSON-LD: Organization, WebSite, SoftwareApplication (home), FAQPage (faq), Blog, BlogPosting, BreadcrumbList
- `sitemap.xml`, `robots.txt` (open to search and AI crawlers), `llms.txt`
- Every blog post opens with a short answer box

## Before launch

Add a privacy policy page and link it in the footer, since the form collects contact info.

To add a blog post: copy a file in `public/blog/`, update the content, title, description, date and JSON-LD, then add it to `public/blog.html`, the home page teasers, `public/sitemap.xml` and `public/llms.txt`.
