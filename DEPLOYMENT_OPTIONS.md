# Deployment Options

This project supports multiple deployment methods. Choose the one that best fits your needs.

## 📊 Comparison

| Method | Best For | Database | Auth | Setup Time | Complexity |
|--------|----------|----------|------|------------|------------|
| **Local Dev (Supabase)** | Active development | Local Supabase | Full Supabase Auth | 5 min | Low |
| **Docker** | Quick testing, demos | PostgreSQL | Simplified | 2 min | Very Low |
| **Production (Vercel + Supabase)** | Production use | Supabase Cloud | Full Supabase Auth | 15 min | Medium |

## 🚀 Quick Start Commands

### Local Development with Supabase

```bash
# Install dependencies
npm install

# Start Supabase
npm run dev:supabase

# Start app
npm run dev
```

**Access**: http://localhost:3000
**Documentation**: [LOCALDEV_QUICKSTART.md](./LOCALDEV_QUICKSTART.md)

---

### Docker (Easiest)

```bash
cd docker
docker-compose up -d
```

**Access**: http://localhost:3000
**Documentation**: [docker/README.md](./docker/README.md)

---

### Production (Vercel + Supabase Cloud)

```bash
# Deploy to Vercel
vercel deploy --prod

# Configure Supabase Cloud
# See documentation for details
```

**Documentation**: [Documentation/VERCEL.md](./Documentation/VERCEL.md)

---

## 🔍 Detailed Comparison

### Local Development with Supabase

**Pros:**
- Full Supabase feature set (Auth, Storage, Edge Functions, Realtime)
- Hot reload for development
- Supabase Studio for database management
- Email testing with Mailpit
- Perfect for active development

**Cons:**
- Requires Docker Desktop
- Uses multiple ports (54321-54327)
- More services to manage

**Use When:**
- Actively developing features
- Need full Supabase features
- Testing auth flows
- Working on database schema

**Setup:**
```bash
npm install
npm run dev:supabase    # Start Supabase
npm run dev             # Start app
```

**Ports:**
- App: 3000
- Supabase API: 54321
- PostgreSQL: 54322
- Supabase Studio: 54323
- Mailpit: 54324

---

### Docker Deployment

**Pros:**
- Simplest setup (one command)
- Isolated environment
- No port conflicts
- Easy to share/demo
- Production-like build

**Cons:**
- Simplified auth (no OAuth, magic links)
- No email delivery
- Less tooling than Supabase local
- Manual user activation

**Use When:**
- Quick testing
- Demos/presentations
- Testing production builds
- Sharing with others
- Don't need full auth features

**Setup:**
```bash
cd docker
docker-compose up -d
```

**Ports:**
- App: 3000
- PostgreSQL: 5433
- Prisma Studio (optional): 5555

---

### Production Deployment

**Pros:**
- Fully managed infrastructure
- Global CDN
- Auto-scaling
- Full Supabase features
- Real email delivery
- Professional hosting

**Cons:**
- Costs money (both Vercel and Supabase)
- More complex setup
- Environment variable management
- Deployment process

**Use When:**
- Ready for production
- Need public access
- Want auto-scaling
- Need full auth features
- Want professional hosting

**Required:**
- Vercel account
- Supabase Cloud project
- Domain (optional)

---

## 🛠️ Feature Comparison

| Feature | Local Supabase | Docker | Production |
|---------|----------------|--------|------------|
| **Database** | ✅ Full PostgreSQL | ✅ Full PostgreSQL | ✅ Supabase Cloud |
| **Auth - Email/Password** | ✅ Full | ⚠️ Simplified | ✅ Full |
| **Auth - OAuth (Google, etc)** | ✅ Yes | ❌ No | ✅ Yes |
| **Auth - Magic Links** | ✅ Yes | ❌ No | ✅ Yes |
| **Email Testing** | ✅ Mailpit | ❌ No emails | ✅ Real emails |
| **Database UI** | ✅ Supabase Studio | ✅ Prisma Studio | ✅ Supabase Studio |
| **Hot Reload** | ✅ Yes | ❌ No | N/A |
| **Edge Functions** | ✅ Yes | ❌ No | ✅ Yes |
| **Storage** | ✅ Yes | ❌ No | ✅ Yes |
| **Realtime** | ✅ Yes | ❌ No | ✅ Yes |
| **AI (LM Studio)** | ✅ Yes | ✅ Yes* | ⚠️ Via tunnel |
| **AI (OpenRouter)** | ✅ Yes | ✅ Yes | ✅ Yes |

*Docker can access LM Studio on host via `host.docker.internal`

---

## 💡 Recommendations

### For Development
**Use Local Supabase** - You get the full development experience with all features.

```bash
npm run dev:supabase && npm run dev
```

### For Quick Testing
**Use Docker** - One command to start everything.

```bash
cd docker && docker-compose up -d
```

### For Sharing a Demo
**Use Docker or Vercel Preview** - Easy to share a link.

```bash
# Docker
cd docker && docker-compose up -d

# Or Vercel preview
vercel deploy
```

### For Production
**Use Vercel + Supabase Cloud** - Professional, scalable hosting.

See [Documentation/VERCEL.md](./Documentation/VERCEL.md)

---

## 🔄 Switching Between Methods

### Local Supabase → Docker

1. Stop Supabase: `npm run dev:stop`
2. Start Docker: `cd docker && docker-compose up -d`

### Docker → Local Supabase

1. Stop Docker: `docker-compose down`
2. Start Supabase: `npm run dev:supabase && npm run dev`

### Local → Production

1. Create Supabase Cloud project
2. Run migrations on cloud
3. Deploy to Vercel with environment variables

See [Documentation/VERCEL.md](./Documentation/VERCEL.md)

---

## 📚 Next Steps

- **Local Development**: [LOCALDEV_QUICKSTART.md](./LOCALDEV_QUICKSTART.md)
- **Docker**: [docker/README.md](./docker/README.md)
- **Production**: [Documentation/VERCEL.md](./Documentation/VERCEL.md)
- **User Guide**: [Documentation/USER_GUIDE.md](./Documentation/USER_GUIDE.md)
