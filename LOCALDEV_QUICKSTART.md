# Local Development Quick Start

This project is now configured for local development with **Supabase** and **Vercel Dev**.

## First Time Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Supabase
```bash
npm run dev:supabase
```

**What this does:**
- Starts local PostgreSQL on port 54322
- Runs all migrations from `supabase/migrations/`
- Starts Supabase Studio on http://localhost:54323
- Starts Mailpit (email testing) on http://localhost:54324

**Important URLs:**
- **Supabase Studio**: http://localhost:54323 (database UI)
- **Mailpit**: http://localhost:54324 (email testing)
- **API**: http://127.0.0.1:54321

### 3. Generate Prisma Client
```bash
npm run postinstall
```

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

**Optional - Using Vercel Dev:**

If you want to use Vercel Dev (for better serverless function simulation):

```bash
vercel login    # Login to Vercel
vercel link     # Link your project
npm run dev:vercel
```

## Environment Variables

All local environment variables are pre-configured in `.env.local`:

- **DATABASE_URL**: Points to local Supabase PostgreSQL
- **NEXT_PUBLIC_SUPABASE_URL**: http://127.0.0.1:54321
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**: Local dev key
- **SUPABASE_SERVICE_ROLE_KEY**: Local service role key

You can modify AI provider settings (LM Studio or OpenRouter) in `.env.local`.

## Creating Your First Admin User

1. Navigate to http://localhost:3000
2. Sign up with an email
3. Check Mailpit (http://localhost:54324) for the confirmation email
4. After confirming, open Supabase Studio (http://localhost:54323)
5. Go to **Table Editor** → **profiles**
6. Find your user and change `role` from `PENDING` to `ADMIN`

## Daily Workflow

```bash
# Start Supabase (if not running)
npm run dev:supabase

# Start the app
npm run dev

# Open app at http://localhost:3000
```

## Useful Commands

```bash
# Start the app (Next.js)
npm run dev

# Start with Vercel Dev (optional, requires vercel login/link)
npm run dev:vercel

# View database in Supabase Studio
npm run dev:studio

# View database in Prisma Studio
npm run db:studio

# Reset database (clears all data and re-runs migrations)
npm run dev:reset

# Stop Supabase
npm run dev:stop

# Run tests
npm test
npm run test:e2e
```

## Database Management

### With Supabase Migrations (Recommended)

When you need to change the database schema:

1. Create a new migration file:
   ```bash
   supabase db diff -f your_migration_name
   ```

2. Edit the migration in `supabase/migrations/`

3. Apply migrations:
   ```bash
   npm run dev:reset
   ```

4. Update your Prisma schema to match (if needed)

5. Generate Prisma Client:
   ```bash
   npm run postinstall
   ```

### Schema Management Notes

- **Supabase manages the database schema** via migrations in `supabase/migrations/`
- **Prisma is used as a query client** - don't use `prisma db push` for schema changes
- The `auth` schema is managed entirely by Supabase
- The `public` schema is defined in your Supabase migrations

## Troubleshooting

### Port Conflicts

If you see "port already in use":

```bash
# Stop Supabase
npm run dev:stop

# If needed, kill processes
lsof -ti:54321,54322,54323,54324 | xargs kill -9

# Restart
npm run dev:supabase
```

### Database Connection Issues

```bash
# Check Supabase status
supabase status

# Ensure Docker is running
# Restart Supabase
npm run dev:stop && npm run dev:supabase
```

### Prisma Client Out of Sync

```bash
npm run postinstall
```

## What Changed?

### New Configuration Files

- **`supabase/config.toml`**: Supabase local configuration
- **`supabase/migrations/`**: Database migrations
- **`supabase/seed.sql`**: Database seed data
- **`.env.local`**: Local development environment variables

### Updated Files

- **`package.json`**: Added local dev scripts
- **`prisma.config.ts`**: Now loads `.env.local` automatically
- **`prisma/schema.prisma`**: Updated to work with Supabase

### New Scripts in package.json

- `dev`: Start with Next.js dev server
- `dev:vercel`: Start with Vercel Dev (optional, requires login/link)
- `dev:supabase`: Start local Supabase
- `dev:stop`: Stop local Supabase
- `dev:reset`: Reset database
- `dev:studio`: Open Supabase Studio
- `db:studio`: Open Prisma Studio

## Production vs Local

| Aspect | Local | Production |
|--------|-------|------------|
| Database | Local PostgreSQL (port 54322) | Supabase Cloud |
| Auth | Local Supabase Auth | Supabase Cloud Auth |
| API | http://127.0.0.1:54321 | https://[PROJECT].supabase.co |
| Environment | `.env.local` | Vercel Environment Variables |
| Emails | Mailpit (http://localhost:54324) | Real SMTP |

## Next Steps

- Read [Documentation/LOCAL_DEVELOPMENT.md](./Documentation/LOCAL_DEVELOPMENT.md) for detailed information
- Check [Documentation/SETUP.md](./Documentation/SETUP.md) for production deployment
- Review [Documentation/USER_GUIDE.md](./Documentation/USER_GUIDE.md) for app features
