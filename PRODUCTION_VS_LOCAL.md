# Production vs Local Development

This document clarifies which files and configurations are for local development only and which are used in production.

## 📋 File Classification

### Local Development ONLY (Not in Production)

These files are excluded from git and/or Vercel deployments:

| File/Directory | Purpose | Excluded By |
|----------------|---------|-------------|
| `.env.local` | Local Supabase configuration | `.gitignore`, `.vercelignore` |
| `.env.docker` | Docker environment variables | `.gitignore`, `.vercelignore` |
| `supabase/.branches/` | Supabase local state | `supabase/.gitignore` |
| `supabase/.temp/` | Supabase temporary files | `supabase/.gitignore` |
| `supabase/config.toml` | Local Supabase configuration | `.vercelignore` |
| `supabase/seed.sql` | Local database seeds | `.vercelignore` |
| `docker/` | Docker deployment files | `.vercelignore` |
| `LOCALDEV_QUICKSTART.md` | Local dev documentation | `.vercelignore` |
| `Documentation/LOCAL_DEVELOPMENT.md` | Local dev guide | `.vercelignore` |

### Shared Files (Used in Both)

These files are used in both local and production:

| File/Directory | Purpose | Notes |
|----------------|---------|-------|
| `supabase/migrations/` | Database schema | ✅ Committed to git, used in production Supabase |
| `prisma/schema.prisma` | Database schema definition | ✅ Used by Prisma client in both environments |
| `prisma.config.ts` | Prisma configuration | ✅ Safe for production (checks for Vercel env vars first) |
| `package.json` | Dependencies and scripts | ✅ Production uses only `dependencies`, not `devDependencies` |
| `src/` | Application code | ✅ All source code is deployed |
| `.env.example` | Environment template | ✅ Committed to git, not used at runtime |

### Production ONLY

These are configured in Vercel, not in local files:

| Configuration | Location | Purpose |
|---------------|----------|---------|
| `DATABASE_URL` | Vercel Environment Variables | Supabase Cloud connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel Environment Variables | Supabase Cloud API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel Environment Variables | Supabase Cloud publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Environment Variables | Supabase Cloud service role key |

---

## 🔒 Environment Variable Precedence

The system uses the following order of precedence:

### Local Development (with Supabase)
1. **Vercel/System environment variables** (highest priority)
2. **`.env.local`** (local overrides for Supabase)
3. **`.env`** (base configuration)

### Docker
1. **`docker-compose.yml` environment section**
2. **`.env.docker`**

### Production (Vercel)
1. **Vercel Environment Variables** (configured in dashboard)
2. **`.env`** (if needed as fallback, but shouldn't be used)

---

## 🚀 What Gets Deployed to Vercel?

### Included
✅ All source code (`src/`, `app/`, etc.)
✅ `package.json` and `package-lock.json`
✅ `prisma/` directory (schema and config)
✅ `supabase/migrations/` (for reference)
✅ `public/` assets
✅ `next.config.ts`
✅ `tailwind.config.ts`
✅ Production documentation

### Excluded (via `.vercelignore`)
❌ `.env.local`
❌ `.env.docker`
❌ `docker/` directory
❌ `supabase/config.toml`
❌ `supabase/.temp/` and `supabase/.branches/`
❌ Test files (`*.test.ts`, `e2e/`)
❌ Local dev documentation
❌ Development tools config (`.vscode/`, etc.)

---

## 🔧 Package.json Scripts

### Local Development Scripts
These scripts use local Supabase or Docker:

```json
{
  "dev": "next dev",
  "dev:vercel": "vercel dev",
  "dev:supabase": "supabase start",
  "dev:stop": "supabase stop",
  "dev:reset": "supabase db reset",
  "dev:studio": "supabase studio",
  "db:migrate": "dotenv -e .env.local -- prisma migrate dev",
  "db:push": "dotenv -e .env.local -- prisma db push",
  "db:studio": "dotenv -e .env.local -- prisma studio"
}
```

### Production Scripts
These are used by Vercel:

```json
{
  "build": "npx prisma generate && next build",
  "start": "next start",
  "postinstall": "prisma generate"
}
```

**Note:** Vercel only runs `build` and `start`. Local dev scripts are never executed in production.

---

## 📦 Dependencies

### Production Dependencies (`dependencies`)
These are installed in production:

- `@prisma/client` - Database client
- `@supabase/ssr` & `@supabase/supabase-js` - Supabase client
- `next`, `react`, `react-dom` - Framework
- All runtime dependencies

### Development Dependencies (`devDependencies`)
These are NOT installed in production:

- `prisma` - CLI tool (not needed at runtime)
- `dotenv-cli` - Local env loading (not used in production)
- `vitest`, `@playwright/test` - Testing frameworks
- TypeScript, linters, etc.

**Key Point:** Production builds only install `dependencies`, not `devDependencies`, so local dev tools don't bloat production.

---

## 🔐 Security Considerations

### Local Development Keys
These are safe for local use ONLY:

```bash
# .env.local - LOCAL ONLY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
```

These are default Supabase local keys that only work with `localhost:54321`.

### Production Keys
Production keys are:
- ✅ Stored in Vercel Environment Variables (encrypted)
- ✅ Never committed to git
- ✅ Unique to your Supabase Cloud project
- ✅ Rotatable from Supabase dashboard

---

## 🧪 Testing the Separation

### Verify Local Files Won't Deploy

1. Check `.vercelignore`:
   ```bash
   cat .vercelignore
   ```

2. Dry-run a Vercel build:
   ```bash
   vercel build
   ```

3. Check what files are included:
   ```bash
   # The build output should NOT include:
   # - .env.local
   # - docker/
   # - supabase/config.toml
   ```

### Verify Production Uses Correct Config

1. In Vercel dashboard, check Environment Variables
2. Deploy a preview branch
3. Check logs - should use Supabase Cloud URLs, not `localhost:54321`

---

## 📝 Checklist for Production Deployment

Before deploying to production, verify:

- [ ] `.env.local` is in `.gitignore` ✅ (Already done)
- [ ] `.vercelignore` excludes local dev files ✅ (Already done)
- [ ] Vercel Environment Variables are configured
  - [ ] `DATABASE_URL` (Supabase Cloud)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] AI provider settings (LM Studio won't work in prod - use OpenRouter)
- [ ] Supabase migrations run on production database
- [ ] Production build succeeds: `vercel build`

---

## 🔄 Migration Path: Local → Production

1. **Develop Locally**
   - Use local Supabase (`npm run dev:supabase`)
   - Create migrations with `supabase db diff`
   - Test thoroughly

2. **Apply to Production**
   - Push migrations to git
   - Run migrations on Supabase Cloud:
     ```bash
     supabase db push --project-ref your-project-ref
     ```
   - Or use Supabase Dashboard SQL Editor

3. **Deploy Code**
   - Push to git
   - Vercel auto-deploys
   - Vercel uses environment variables (not .env.local)

---

## ❓ Common Questions

### Q: Will `.env.local` be deployed to Vercel?
**A:** No. It's excluded by both `.gitignore` (not in git) and `.vercelignore` (Vercel won't use it).

### Q: Will Docker files be deployed?
**A:** No. The `docker/` directory is excluded by `.vercelignore`.

### Q: Will local Supabase config affect production?
**A:** No. `supabase/config.toml` is excluded by `.vercelignore`, and migrations in `supabase/migrations/` are for reference only in production.

### Q: Can I use LM Studio in production?
**A:** No. LM Studio runs on your local machine. Use OpenRouter or another cloud AI provider for production.

### Q: What if I push `.env` to git by accident?
**A:** Don't do this! `.env` should contain production secrets and should stay in `.gitignore`. Use `.env.example` as a template only.

### Q: How do I test production config locally?
**A:** Create a `.env.production.local` file with production values and use:
```bash
NODE_ENV=production npm run dev
```

---

## 🛡️ Best Practices

1. **Never commit secrets** - Use `.env.example` for templates
2. **Use `.env.local` for local dev** - Keeps your local config separate
3. **Use Vercel env vars for production** - Encrypted and secure
4. **Keep migrations in git** - `supabase/migrations/` should be committed
5. **Document environment variables** - Update `.env.example` when adding new vars
6. **Test production builds locally** - Run `vercel build` before deploying

---

## 📚 Related Documentation

- [Deployment Options](./DEPLOYMENT_OPTIONS.md) - Compare deployment methods
- [Local Development Guide](./LOCALDEV_QUICKSTART.md) - Local setup
- [Vercel Deployment](./Documentation/VERCEL.md) - Production deployment
