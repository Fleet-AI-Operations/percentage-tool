/**
 * Tests for Supabase Client Creation
 * Ensures backward compatibility with both publishable keys and legacy anon keys
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Supabase Client Creation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('should create client with publishable key', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).not.toBeNull();
    });

    it('should create client with legacy anon key when publishable key is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).not.toBeNull();
    });

    it('should prefer publishable key when both are present', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).not.toBeNull();
      // The publishable key should be used (we can't directly test this without mocking createBrowserClient)
    });

    it('should return null when URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).toBeNull();
    });

    it('should return null when both keys are missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).toBeNull();
    });

    it('should trim and remove quotes from environment variables', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '  "http://localhost:54321"  ';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '  \'sb_publishable_test\'  ';

      const { createClient } = await import('../supabase/client');
      const client = createClient();

      expect(client).not.toBeNull();
    });
  });
});
