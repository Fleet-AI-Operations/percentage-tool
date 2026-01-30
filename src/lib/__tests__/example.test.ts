/**
 * Example Test File
 * Demonstrates how to write tests with the new local Supabase setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockPrisma,
  createTestUser,
  createTestProject,
  resetAllMocks,
} from './helpers';

// Mock Prisma using the helper
const { mockPrisma } = vi.hoisted(() => createMockPrisma());

vi.mock('../prisma', () => ({
  prisma: mockPrisma,
}));

describe('Example Test Suite', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('User Operations', () => {
    it('should find user by email', async () => {
      const testUser = createTestUser({ email: 'test@example.com' });

      mockPrisma.profile.findUnique.mockResolvedValue(testUser);

      // Your actual function that uses prisma
      // const user = await findUserByEmail('test@example.com');

      expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('Project Operations', () => {
    it('should create a project', async () => {
      const testProject = createTestProject({ name: 'New Project' });

      mockPrisma.project.create.mockResolvedValue(testProject);

      // Your actual function that uses prisma
      // const project = await createProject('New Project');

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Project',
        }),
      });
    });
  });
});
