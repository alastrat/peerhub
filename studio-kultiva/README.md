# Kultiva Sanity Studio

Content management studio for the Kultiva website.

## Setup

### 1. Create a Sanity Project

1. Go to [sanity.io/manage](https://www.sanity.io/manage)
2. Create a new project named "Kultiva"
3. Copy the Project ID

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your project ID
SANITY_STUDIO_PROJECT_ID="your-project-id"
SANITY_STUDIO_DATASET="production"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Studio

```bash
npm run dev
```

The studio will be available at http://localhost:3333

## Deployment

### Option 1: Sanity Managed Hosting (Recommended)

```bash
npm run deploy
```

This deploys to `https://<your-project>.sanity.studio`

### Option 2: Self-Hosted (Vercel, Netlify, etc.)

```bash
npm run build
```

Deploy the `dist` folder to your hosting provider.

## Content Types

| Type | Description |
|------|-------------|
| **Post** | Blog articles with localized content (ES/EN) |
| **Author** | Blog post authors |
| **Category** | Blog categories |
| **Service** | Service offerings with FAQs and benefits |
| **Testimonial** | Client testimonials |
| **Team Member** | Team profiles |
| **Client** | Client logos for the homepage |
| **FAQ** | General frequently asked questions |
| **Hero Slide** | Homepage hero carousel slides |
| **Site Settings** | Global site configuration (contact info, social links) |

## Localization

All text fields support Spanish (ES) and English (EN) using field-level localization:

- `localeString` - Single-line text
- `localeText` - Multi-line text
- `localeBlockContent` - Rich text with formatting

## Webhooks

Configure a webhook in [Sanity Dashboard](https://www.sanity.io/manage) to trigger revalidation:

- **URL:** `https://your-site.com/api/revalidate`
- **HTTP method:** POST
- **Secret:** Set `SANITY_WEBHOOK_SECRET` in your Next.js app
- **Trigger on:** Create, Update, Delete
