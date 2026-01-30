# Testing Setup Summary

This document summarizes the testing configuration for local development with Supabase.

## ✅ What Was Updated

### 1. Test Environment Configuration

**New Files:**
- `.env.test` - Test environment variables (uses local Supabase)
- `Documentation/TESTING.md` - Comprehensive testing guide
- `src/lib/__tests__/helpers.ts` - Unit test helpers
- `e2e/helpers.ts` - E2E test helpers
- `src/lib/__tests__/example.test.ts` - Example unit test
- `e2e/example.spec.ts` - Example E2E test

**Updated Files:**
- `vitest.config.ts` - Loads `.env.test` for unit tests
- `vitest.setup.ts` - Loads environment variables
- `playwright.config.ts` - Loads `.env.test` for E2E tests
- `package.json` - Updated test scripts

### 2. Test Scripts

New test commands in `package.json`:

```json
{
  "test": "dotenv -e .env.test -- vitest run",
  "test:watch": "dotenv -e .env.test -- vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:ci": "npm run test && npm run test:e2e"
}
```

### 3. Environment Configuration

Tests use `.env.test` which points to local Supabase:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
```

### 4. Git Configuration

Updated `.gitignore` to include `.env.test`:
```
!.env.test  # Test environment is safe to commit
```

Updated `.vercelignore` to exclude `.env.test`:
```
.env.test  # Don't deploy test config to production
```

---

## 🚀 Running Tests

### Prerequisites

**Start Supabase:**
```bash
npm run dev:supabase
```

### Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage
npm test -- --coverage
```

**What they test:**
- Individual functions and components
- Business logic
- Utility functions
- Mocked database operations

**Configuration:**
- Framework: Vitest
- Environment: jsdom (browser-like)
- Database: Mocked with `vi.mock()`
- Speed: Fast (< 1s per test)

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npx playwright test --debug
```

**What they test:**
- Complete user flows
- Authentication
- Navigation
- Form submissions
- Real database operations

**Configuration:**
- Framework: Playwright
- Environment: Real browser (Chromium)
- Database: Real local Supabase
- Speed: Slower (5-30s per test)

### All Tests

```bash
# Run unit tests + E2E tests
npm run test:ci
```

---

## 📝 Writing Tests

### Unit Test Example

```typescript
// src/lib/__tests__/myFeature.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMockPrisma, createTestUser } from './helpers';

const { mockPrisma } = vi.hoisted(() => createMockPrisma());
vi.mock('../prisma', () => ({ prisma: mockPrisma }));

describe('My Feature', () => {
  it('should do something', async () => {
    const testUser = createTestUser({ email: 'test@example.com' });
    mockPrisma.profile.findUnique.mockResolvedValue(testUser);

    // Your test logic here
    expect(true).toBe(true);
  });
});
```

### E2E Test Example

```typescript
// e2e/myFeature.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestData } from './helpers';

test.describe('My Feature', () => {
  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should navigate to page', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

---

## 🛠️ Test Helpers

### Unit Test Helpers

Located in `src/lib/__tests__/helpers.ts`:

- `createMockPrisma()` - Mock Prisma client
- `createMockSupabaseClient()` - Mock Supabase client
- `mockAIResponse()` - Mock AI API responses
- `createTestUser()` - Generate test user data
- `createTestProject()` - Generate test project data
- `createTestDataRecord()` - Generate test data record

### E2E Test Helpers

Located in `e2e/helpers.ts`:

- `setupTestEnvironment()` - Check Supabase health
- `teardownTestEnvironment()` - Cleanup and disconnect
- `createTestUser()` - Create user in database
- `deleteTestUser()` - Remove user from database
- `createTestProject()` - Create project in database
- `cleanupTestData()` - Remove all test data
- `login()` - Login helper
- `checkSupabaseHealth()` - Verify Supabase is running

---

## 🔍 Test Environment Details

### Test Database

Tests use the **local Supabase database**:
- Host: `127.0.0.1:54322`
- Database: `postgres`
- User: `postgres`
- Password: `postgres`

**Important:**
- Unit tests **mock** database calls (don't touch DB)
- E2E tests **use real** local database
- Test data is created/cleaned up automatically

### Environment Variables

**Priority:**
1. System environment variables (highest)
2. `.env.test` (test-specific)
3. `.env.local` (local dev)
4. `.env` (base config)

### Test Isolation

**Unit Tests:**
- ✅ Fully isolated (all mocked)
- ✅ No database access
- ✅ No real API calls
- ✅ Fast execution

**E2E Tests:**
- ⚠️ Use real local database
- ⚠️ Data created during tests
- ✅ Cleaned up after each test
- ⚠️ Slower execution

---

## 🐛 Troubleshooting

### Tests Fail: "Cannot connect to database"

**Solution:**
```bash
# Start Supabase
npm run dev:supabase

# Verify it's running
supabase status
```

### Tests Fail: "Supabase is not running"

**E2E tests check Supabase health before running.**

**Solution:**
```bash
# Ensure Supabase is accessible
curl http://127.0.0.1:54321/health

# If not, restart
npm run dev:stop
npm run dev:supabase
```

### Unit Tests Fail: "Cannot find module"

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate
```

### E2E Tests Timeout

**Increase timeout in `playwright.config.ts`:**
```typescript
webServer: {
  timeout: 120 * 1000, // 2 minutes
}
```

### Test Data Persists

**Solution:** Add cleanup in `afterEach`:
```typescript
test.afterEach(async () => {
  await cleanupTestData();
});
```

---

## 📊 Test Coverage

### View Coverage

```bash
npm test -- --coverage
```

### Coverage Report

- Terminal summary
- HTML report: `coverage/index.html`
- Open with: `open coverage/index.html`

---

## 🔗 Related Documentation

- **[Documentation/TESTING.md](./Documentation/TESTING.md)** - Full testing guide
- **[LOCALDEV_QUICKSTART.md](./LOCALDEV_QUICKSTART.md)** - Local development setup
- **[PRODUCTION_VS_LOCAL.md](./PRODUCTION_VS_LOCAL.md)** - Environment separation

---

## 📋 Quick Reference

### Common Commands

```bash
# Start Supabase (required for E2E tests)
npm run dev:supabase

# Run unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# All tests
npm run test:ci

# Coverage
npm test -- --coverage
```

### Test File Locations

```
src/
  lib/
    __tests__/
      helpers.ts          # Unit test helpers
      example.test.ts     # Example unit test
      ai.test.ts          # AI tests
      ingestion.test.ts   # Ingestion tests

e2e/
  helpers.ts              # E2E test helpers
  example.spec.ts         # Example E2E test
  auth.spec.ts            # Auth tests
  smoke.spec.ts           # Smoke tests
```

### Configuration Files

```
.env.test               # Test environment variables
vitest.config.ts        # Vitest configuration
vitest.setup.ts         # Vitest setup
playwright.config.ts    # Playwright configuration
```

---

## ✅ CI/CD Ready

Tests are configured to run in CI environments:

```yaml
# .github/workflows/test.yml
- name: Start Supabase
  run: npx supabase start

- name: Run tests
  run: npm run test:ci
```

The test suite will:
1. Start local Supabase automatically
2. Run unit tests
3. Run E2E tests
4. Generate coverage reports
5. Upload test artifacts
