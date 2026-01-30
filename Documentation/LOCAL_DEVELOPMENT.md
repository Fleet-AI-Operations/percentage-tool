# Local Development Setup

This guide will help you set up local development with Supabase and Vercel Dev.

## Prerequisites

- Node.js 20+ installed
- Supabase CLI installed (`brew install supabase/tap/supabase` on macOS)
- Vercel CLI installed (automatically installed via `npm install -g vercel`)
- Docker Desktop running (required for Supabase local)

## Quick Start

### 1. Start Supabase

Start the local Supabase instance (PostgreSQL, Auth, Storage, etc.):

```bash
npm run dev:supabase
```

This will:
- Start PostgreSQL on port 54322
- Start Supabase Studio on http://localhost:54323
- Run all migrations from `supabase/migrations`
- Apply seed data from `supabase/seed.sql`

**Important URLs:**
- Supabase Studio: http://localhost:54323
- API URL: http://127.0.0.1:54321
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Inbucket (Email testing): http://localhost:54324

### 2. Configure Environment

The `.env.local` file has been pre-configured with local Supabase credentials. These are the default local development keys that Supabase provides.

**Note:** These keys are safe for local development and are not secrets.

### 3. Run Prisma Migrations

Push your Prisma schema to the local Supabase database:

```bash
npm run db:push
```

Or use Prisma migrations:

```bash
npm run db:migrate
```

### 4. Start the Development Server

Start the Next.js app with Vercel Dev (this provides a better local development experience):

```bash
npm run dev
```

This will start:
- Next.js app on http://localhost:3000
- Vercel Dev with proper serverless function simulation

## Development Workflow

### Daily Workflow

1. **Start Supabase** (if not already running):
   ```bash
   npm run dev:supabase
   ```

2. **Start the app**:
   ```bash
   npm run dev
   ```

3. **Open the app**: http://localhost:3000

### Database Management

**View Database:**
```bash
npm run dev:studio  # Opens Supabase Studio
# OR
npm run db:studio   # Opens Prisma Studio
```

**Reset Database** (clear all data and re-run migrations):
```bash
npm run dev:reset
```

**Stop Supabase**:
```bash
npm run dev:stop
```

### Creating Database Migrations

When you modify your Prisma schema:

1. **Update** `prisma/schema.prisma`

2. **Create a Supabase migration**:
   ```bash
   supabase db diff -f your_migration_name
   ```

3. **Apply the migration**:
   ```bash
   npm run dev:reset
   ```

4. **Update Prisma Client**:
   ```bash
   npm run db:push
   ```

## Authentication Setup

### Creating Your First Admin User

1. Start the app and navigate to http://localhost:3000
2. Sign up with your email
3. Check Inbucket for the confirmation email: http://localhost:54324
4. After signing up, open Supabase Studio: http://localhost:54323
5. Navigate to **Table Editor** > **profiles**
6. Find your user and change `role` from `PENDING` to `ADMIN`
7. Refresh the app - you should now have admin access

**Alternative (SQL):**
```sql
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

Run this in Supabase Studio SQL Editor.

## Local vs Production

### Local Development
- **Database**: Local PostgreSQL (port 54322)
- **Auth**: Local Supabase Auth
- **API**: http://127.0.0.1:54321
- **Environment**: `.env.local`

### Production
- **Database**: Supabase Cloud PostgreSQL
- **Auth**: Supabase Cloud Auth
- **API**: https://[PROJECT-REF].supabase.co
- **Environment**: Vercel Environment Variables

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Stop Supabase
npm run dev:stop

# Kill any remaining processes
lsof -ti:54321,54322,54323,54324 | xargs kill -9

# Restart
npm run dev:supabase
```

### Database Connection Issues

1. **Verify Supabase is running**:
   ```bash
   supabase status
   ```

2. **Check Docker**:
   Ensure Docker Desktop is running.

3. **Reset everything**:
   ```bash
   npm run dev:stop
   npm run dev:supabase
   npm run dev:reset
   ```

### Prisma Client Issues

If you see "Prisma Client not found" errors:

```bash
npm run postinstall
# OR
npx prisma generate
```

### Supabase Migrations Fail

If migrations fail during `supabase start`:

1. **Stop Supabase**:
   ```bash
   supabase db stop --no-backup
   ```

2. **Check migration files** in `supabase/migrations/`

3. **Restart**:
   ```bash
   npm run dev:supabase
   ```

## Environment Variables Reference

### Required for Local Development

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<local-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<local-service-role-key>"

# AI Provider (LM Studio or OpenRouter)
AI_HOST="http://localhost:1234/v1"
LLM_MODEL="meta-llama-3.1-8b-instruct"
EMBEDDING_MODEL="text-embedding-nomic-embed-text-v1.5"
```

## Testing

### Run Tests with Local Database

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

## Additional Commands

```bash
# View Supabase logs
supabase logs

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.types.ts

# Run Supabase migrations manually
supabase db reset

# Open Supabase Studio
supabase studio
```

## Next Steps

- Read the [Setup Guide](./SETUP.md) for production deployment
- Check out the [User Guide](./USER_GUIDE.md) for application features
- See [Vercel Deployment](./VERCEL.md) for deploying to production
