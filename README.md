# PeerHub - 360° Performance Evaluation Platform

A multi-tenant SaaS platform for 360-degree performance reviews built with Next.js 15, TypeScript, Tailwind CSS, and PostgreSQL.

## Features

- **Multi-tenant architecture** - Each company has isolated data
- **Magic link authentication** - Passwordless login with optional Google OAuth
- **Review cycles** - Create and manage 360° feedback cycles
- **Template builder** - Visual template builder with sections and questions
- **Multiple reviewer types** - Self, manager, peer, direct reports, external
- **Peer nominations** - Employees nominate peer reviewers with manager approval
- **Anonymous feedback** - Configurable anonymity thresholds
- **Token-based external reviews** - Secure links for external stakeholders
- **Real-time autosave** - Progress saved automatically
- **CSV import** - Bulk import employees with column mapping

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (magic links + Google OAuth)
- **Email**: Resend (dev mode logs to console)
- **Validation**: Zod
- **Forms**: React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local PostgreSQL)
- pnpm, npm, or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd peerhub
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the database:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npm run db:push
```

6. Seed the database (optional):
```bash
npm run db:seed
```

7. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/peerhub"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="PeerHub <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations (production)
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database and reseed
npm run db:reset
```

## Demo Accounts

After running the seed, you can log in with these demo accounts using magic links:

- **Admin**: admin@acme.com
- **Manager**: sarah.eng@acme.com
- **Employee**: james.dev@acme.com

In development mode, magic links are logged to the console.

## Project Structure

```
peerhub/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (marketing)/ # Public pages
│   │   ├── (auth)/      # Auth pages
│   │   ├── (dashboard)/ # Protected app
│   │   └── api/         # API routes
│   ├── components/      # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── design-system/
│   │   ├── layout/
│   │   └── [feature]/
│   ├── lib/
│   │   ├── auth/        # NextAuth config
│   │   ├── db/          # Prisma client
│   │   ├── actions/     # Server actions
│   │   ├── validations/ # Zod schemas
│   │   └── utils/       # Helpers
│   └── types/           # TypeScript types
└── docker-compose.yml   # PostgreSQL + MailHog
```

## Key Features

### Review Cycles
1. Create a cycle with template, dates, and settings
2. Select participants
3. Launch to start nominations/reviews
4. Track completion progress
5. Close and release reports

### Templates
- Sections with reviewer type visibility
- Question types: Rating (1-5), Text, Competency Rating
- Required/optional questions
- Drag-and-drop ordering

### Roles
- **Admin**: Full access to all features
- **Manager**: Team management, view team reports
- **Employee**: Complete reviews, view own report

### Anonymity
- Configurable threshold (e.g., 3 responses minimum)
- Feedback grouped below threshold is hidden
- Text responses shuffled for privacy

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Database (Neon/Supabase)

Use a PostgreSQL provider like Neon or Supabase:
1. Create a database
2. Get connection string
3. Update DATABASE_URL

## License

MIT
