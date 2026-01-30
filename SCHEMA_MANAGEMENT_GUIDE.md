# Schema Management Guide

This document explains how database schema is managed across different deployment environments.

## 📋 Overview

The project uses **different schema management strategies** for each environment:

| Environment | Schema Files | Management Tool | Database |
|-------------|--------------|-----------------|----------|
| **Local Dev** | `supabase/migrations/*.sql` | Supabase CLI | Local Supabase |
| **Docker** | `supabase/setup.sql` | psql | Plain PostgreSQL |
| **Production** | `supabase/setup.sql` or migrations | Supabase Dashboard | Supabase Cloud |

---

## 🏗️ Schema Components

### 1. Auth Schema (Supabase)

**File**: `supabase/setup.sql`

Contains:
- `auth.users` table (managed by Supabase)
- `UserRole` enum (PENDING, USER, MANAGER, ADMIN)
- `public.profiles` table (links to auth.users)
- Row Level Security (RLS) policies
- Helper functions (e.g., `is_admin()`)
- Triggers for auto-profile creation

**Used by**:
- ✅ Docker (`docker-compose.yml`)
- ✅ Production (manual SQL editor or Supabase CLI)
- ❌ Local Dev (uses migrations instead)

### 2. Application Schema (Prisma)

**File**: `prisma/schema.prisma`

Contains:
- `projects` table
- `data_records` table
- `ingest_jobs` table
- `analytics_jobs` table
- `system_settings` table

**Management**:
- Created automatically by Prisma on first run
- Updated via `prisma db push` or `prisma migrate`
- Same across all environments

### 3. Migrations (Local Supabase Only)

**Directory**: `supabase/migrations/`

Contains:
- `20240101000000_init_schema.sql` - Initial schema
- Future migration files...

**Created by**: `supabase start` (not in git)
**Used by**: Local Supabase only

---

## 🔄 Environment-Specific Setup

### Local Development with Supabase

```bash
# Start Supabase (creates migrations/ automatically)
npm run dev:supabase

# Migrations are applied automatically
# Creates:
# - supabase/migrations/ directory (if not exists)
# - Runs all .sql files in migrations/
# - Sets up full Supabase stack

# Start app
npm run dev
```

**Schema Files Used**:
- `supabase/migrations/*.sql` - Auth + full schema
- Prisma generates application tables

**Directory Structure**:
```
supabase/
├── config.toml          # Local Supabase config
├── migrations/          # Created by supabase start
│   └── 20240101000000_init_schema.sql
├── setup.sql           # Not used by local dev
└── .branches/          # Local state (gitignored)
```

---

### Docker Deployment

```bash
cd docker
docker-compose up -d
```

**Schema Files Used**:
- `supabase/setup.sql` - Auth schema only
- Prisma generates application tables

**How It Works**:
1. PostgreSQL starts and auto-runs `supabase/setup.sql` (creates auth schema, profiles, RLS)
2. Migration service generates Prisma Client
3. App starts and Prisma creates application tables

**Directory Structure**:
```
supabase/
├── setup.sql           # ✅ Used by Docker
├── config.toml         # Not used by Docker
└── migrations/         # Not used by Docker
```

---

### Production (Vercel + Supabase Cloud)

```bash
# Option 1: Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of supabase/setup.sql
# 3. Run the SQL

# Option 2: Supabase CLI
supabase db push --project-ref your-project-ref
```

**Schema Files Used**:
- `supabase/setup.sql` or migrations - Auth schema
- Prisma generates application tables on first deploy

**How It Works**:
1. Supabase Cloud provides auth.users
2. You run `setup.sql` to create profiles table and RLS
3. App deploys to Vercel
4. Prisma creates application tables on first run

---

## 🎯 Why Different Approaches?

### Local Supabase Uses Migrations

**Advantages**:
- Full version control of schema changes
- Automatic migration application
- Rollback support
- Development-friendly workflow

**How It Works**:
```bash
# Create new migration
supabase db diff -f my_migration_name

# Applied automatically on next start
supabase start
```

### Docker Uses Single SQL File

**Advantages**:
- Simple, single-file setup
- No dependencies on Supabase CLI
- Easy to understand and modify
- Faster container startup

**Why Not Migrations?**:
- Would need to copy migrations from local to git
- More complex orchestration
- Docker is for simple deployments, not active development

### Production Uses Manual Setup

**Advantages**:
- Full control over timing
- Can review before applying
- Works with Supabase Cloud features
- No automatic changes

---

## 📝 Common Operations

### Adding a New Migration (Local Dev)

```bash
# 1. Make schema changes in Supabase Studio
# 2. Generate migration
supabase db diff -f add_new_feature

# 3. Review the generated SQL
cat supabase/migrations/[timestamp]_add_new_feature.sql

# 4. Commit to git (for production reference)
git add supabase/migrations/
git commit -m "Add new feature migration"
```

### Updating Docker Schema

If auth schema changes:

```bash
# 1. Update supabase/setup.sql
# 2. Rebuild Docker
docker-compose down -v
docker-compose up -d
```

### Updating Production Schema

```bash
# Option 1: Manual SQL
# Copy migration content to Supabase Dashboard SQL Editor

# Option 2: Supabase CLI
supabase db push --project-ref your-project-ref
```

---

## 🔍 Schema Sync Checklist

When making schema changes:

- [ ] **Local Dev**: Changes reflected in `supabase/migrations/`
- [ ] **Docker**: Update `supabase/setup.sql` if auth schema changed
- [ ] **Production**: Apply migration via Supabase Dashboard
- [ ] **Prisma**: Run `prisma db pull` if database schema changed
- [ ] **Git**: Commit migration files (optional for Docker)

---

## 🚨 Important Notes

### What's in Git

✅ **Committed**:
- `supabase/setup.sql` - Auth setup for Docker/Production
- `supabase/config.toml` - Local Supabase config
- `supabase/seed.sql` - Seed data for local dev
- `supabase/migrations/` - Schema migrations (optional)

❌ **Not Committed** (gitignored):
- `supabase/.branches/` - Local Supabase state
- `supabase/.temp/` - Temporary files

### Prisma vs Supabase

- **Supabase manages**: Auth schema (`auth.users`, `profiles`, RLS)
- **Prisma manages**: Application schema (`projects`, `data_records`, etc.)
- **Both work together**: Profiles references auth.users

### Schema Conflicts

If Prisma and Supabase both try to manage the same table:
- ⚠️ Conflicts can occur
- ✅ Solution: Use Supabase for auth, Prisma for app tables
- ✅ Don't put auth tables in Prisma schema

---

## 🔗 Related Documentation

- [Local Development Guide](./LOCALDEV_QUICKSTART.md)
- [Docker Guide](./docker/README.md)
- [Production Deployment](./Documentation/VERCEL.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
