/**
 * Example E2E Test
 * Demonstrates how to write E2E tests with local Supabase
 */

import { test, expect } from '@playwright/test';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  deleteTestUser,
  cleanupTestData,
} from './helpers';

test.describe('Example E2E Test Suite', () => {
  // Check Supabase is running before all tests
  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  // Clean up after all tests
  test.afterAll(async () => {
    await teardownTestEnvironment();
  });

  // Clean up after each test
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText(/Sign In/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should create user and login', async ({ page }) => {
    // Create test user in database
    const user = await createTestUser('newuser@example.com', 'USER');

    // Try to login (this test assumes you have a way to set password)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'testpassword');

    // Note: You'll need to implement actual login logic
    // This is just an example structure

    // Cleanup
    await deleteTestUser('newuser@example.com');
  });
});
